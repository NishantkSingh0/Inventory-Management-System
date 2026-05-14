package handlers

import (
	"Backend/db"
	"Backend/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// GET /api/invoices
// Returns all invoices with their items, ordered newest first.
func ListInvoices(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT i.id, i.vendor_id, v.vendor_name, v.gstin_uin,
		       i.invoice_num, i.invoice_date, i.internal_ref,
		       i.total_tax, i.total_amount, i.invoice_img_url, i.registered_at
		FROM invoices i
		JOIN vendors v ON v.id = i.vendor_id
		ORDER BY i.registered_at DESC`)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch invoices: "+err.Error())
		return
	}
	defer rows.Close()

	invoices := []models.InvoiceWithItems{}
	for rows.Next() {
		var inv models.InvoiceWithItems
		if err := rows.Scan(
			&inv.ID, &inv.VendorID, &inv.VendorName, &inv.GstinUIN,
			&inv.InvoiceNum, &inv.InvoiceDate, &inv.InternalRef,
			&inv.TotalTax, &inv.TotalAmount, &inv.InvoiceImgURL, &inv.RegisteredAt,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		invoices = append(invoices, inv)
	}

	// Fetch items for each invoice
	for i, inv := range invoices {
		itemRows, err := db.DB.Query(`
			SELECT id, invoice_id, item_description, ledger_account,
			       qty, unit, item_rate, amount, hsn_sac,
			       cgst, sgst, igst, total_tax, total_amount
			FROM invoice_items WHERE invoice_id = $1`, inv.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		for itemRows.Next() {
			var item models.InvoiceItem
			if err := itemRows.Scan(
				&item.ID, &item.InvoiceID, &item.ItemDescription, &item.LedgerAccount,
				&item.Qty, &item.Unit, &item.ItemRate, &item.Amount, &item.HsnSac,
				&item.CGST, &item.SGST, &item.IGST, &item.TotalTax, &item.TotalAmount,
			); err != nil {
				itemRows.Close()
				respondError(w, http.StatusInternalServerError, err.Error())
				return
			}
			invoices[i].Items = append(invoices[i].Items, item)
		}
		itemRows.Close()
	}

	respondJSON(w, http.StatusOK, invoices)
}

// POST /api/invoices
// Creates (or reuses) a vendor, creates the invoice, and inserts all items.
func CreateInvoice(w http.ResponseWriter, r *http.Request) {
	var req models.CreateInvoiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if req.VendorName == "" {
		respondError(w, http.StatusBadRequest, "vendor_name is required")
		return
	}
	if len(req.Items) == 0 {
		respondError(w, http.StatusBadRequest, "at least one item is required")
		return
	}

	log.Printf("[invoice] received → vendor=%q gstin=%q invoice_num=%q items=%d",
		req.VendorName, req.GstinUIN, req.InvoiceNum, len(req.Items))

	tx, err := db.DB.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to start transaction: "+err.Error())
		return
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// --- Vendor handling ---
	vendorID, err := findOrCreateVendor(tx, req.VendorName, req.GstinUIN)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Vendor error: "+err.Error())
		return
	}

	// --- Compute invoice-level totals from items ---
	var invoiceTotalTax, invoiceTotalAmount float64
	for _, item := range req.Items {
		invoiceTotalTax += item.TotalTax
		invoiceTotalAmount += item.TotalAmount
	}

	// --- Create invoice ---
	var invoiceID int
	err = tx.QueryRow(`
		INSERT INTO invoices
			(vendor_id, invoice_num, invoice_date, internal_ref,
			 total_tax, total_amount, invoice_img_url)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id`,
		vendorID, req.InvoiceNum, req.InvoiceDate, req.InternalRef,
		invoiceTotalTax, invoiceTotalAmount, req.InvoiceImgURL,
	).Scan(&invoiceID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create invoice: "+err.Error())
		return
	}

	// --- Insert invoice items ---
	insertedItems := make([]models.InvoiceItem, 0, len(req.Items))
	for _, item := range req.Items {
		var itemID int
		err = tx.QueryRow(`
			INSERT INTO invoice_items
				(invoice_id, item_description, ledger_account, qty, unit,
				 item_rate, amount, hsn_sac, cgst, sgst, igst, total_tax, total_amount)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			RETURNING id`,
			invoiceID, item.ItemDescription, item.LedgerAccount, item.Qty, item.Unit,
			item.ItemRate, item.Amount, item.HsnSac,
			item.CGST, item.SGST, item.IGST, item.TotalTax, item.TotalAmount,
		).Scan(&itemID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to insert item: "+err.Error())
			return
		}
		insertedItems = append(insertedItems, models.InvoiceItem{
			ID: itemID, InvoiceID: invoiceID,
			ItemDescription: item.ItemDescription, LedgerAccount: item.LedgerAccount,
			Qty: item.Qty, Unit: item.Unit, ItemRate: item.ItemRate,
			Amount: item.Amount, HsnSac: item.HsnSac,
			CGST: item.CGST, SGST: item.SGST, IGST: item.IGST,
			TotalTax: item.TotalTax, TotalAmount: item.TotalAmount,
		})
	}

	if err = tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit transaction: "+err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, models.InvoiceWithItems{
		Invoice: models.Invoice{
			ID: invoiceID, VendorID: vendorID,
			InvoiceNum: req.InvoiceNum, InvoiceDate: req.InvoiceDate,
			InternalRef: req.InternalRef, TotalTax: invoiceTotalTax,
			TotalAmount: invoiceTotalAmount, InvoiceImgURL: req.InvoiceImgURL,
		},
		VendorName: req.VendorName,
		GstinUIN:   req.GstinUIN,
		Items:      insertedItems,
	})
}

// DELETE /api/invoices/:id
// Removes the invoice and all its items (CASCADE handles items).
func DeleteInvoice(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid invoice id")
		return
	}

	res, err := db.DB.Exec(`DELETE FROM invoices WHERE id = $1`, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete invoice: "+err.Error())
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		respondError(w, http.StatusNotFound, "Invoice not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Invoice and all its items deleted successfully"})
}

// GET /api/invoices/:id
// Returns a single invoice with all its items.
func GetInvoice(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid invoice id")
		return
	}

	row := db.DB.QueryRow(`
		SELECT i.id, i.vendor_id, v.vendor_name, v.gstin_uin,
		       i.invoice_num, i.invoice_date, i.internal_ref,
		       i.total_tax, i.total_amount, i.invoice_img_url, i.registered_at
		FROM invoices i
		JOIN vendors v ON v.id = i.vendor_id
		WHERE i.id = $1`, id)

	var inv models.InvoiceWithItems
	err = row.Scan(
		&inv.ID, &inv.VendorID, &inv.VendorName, &inv.GstinUIN,
		&inv.InvoiceNum, &inv.InvoiceDate, &inv.InternalRef,
		&inv.TotalTax, &inv.TotalAmount, &inv.InvoiceImgURL, &inv.RegisteredAt,
	)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Invoice not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	rows, err := db.DB.Query(`
		SELECT id, invoice_id, item_description, ledger_account,
		       qty, unit, item_rate, amount, hsn_sac,
		       cgst, sgst, igst, total_tax, total_amount
		FROM invoice_items WHERE invoice_id = $1`, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	for rows.Next() {
		var item models.InvoiceItem
		if err := rows.Scan(
			&item.ID, &item.InvoiceID, &item.ItemDescription, &item.LedgerAccount,
			&item.Qty, &item.Unit, &item.ItemRate, &item.Amount, &item.HsnSac,
			&item.CGST, &item.SGST, &item.IGST, &item.TotalTax, &item.TotalAmount,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		inv.Items = append(inv.Items, item)
	}

	respondJSON(w, http.StatusOK, inv)
}

// --- helpers ---

// findOrCreateVendor matches exclusively on gstin_uin when one is provided.
// If no GSTIN is given, a new vendor is always created (no name-based dedup).
func findOrCreateVendor(tx *sql.Tx, vendorName, gstinUIN string) (int, error) {
	var vendorID int

	log.Printf("[vendor] lookup → name=%q gstin=%q", vendorName, gstinUIN)

	if gstinUIN != "" {
		// Dump every vendor row so we can see what is actually stored
		dumpRows, dumpErr := tx.Query(`SELECT id, vendor_name, gstin_uin FROM vendors`)
		if dumpErr == nil {
			log.Printf("[vendor] vendors table dump:")
			for dumpRows.Next() {
				var id int
				var vn, gs string
				_ = dumpRows.Scan(&id, &vn, &gs)
				log.Printf("[vendor]   id=%d  name=%q  gstin=%q", id, vn, gs)
			}
			dumpRows.Close()
		}

		// Match solely on GSTIN
		err := tx.QueryRow(
			`SELECT id FROM vendors WHERE gstin_uin = $1 LIMIT 1`,
			gstinUIN,
		).Scan(&vendorID)

		if err == nil {
			log.Printf("[vendor] MATCHED existing vendor id=%d via gstin=%q", vendorID, gstinUIN)
			return vendorID, nil
		}
		if err != sql.ErrNoRows {
			log.Printf("[vendor] ERROR during lookup: %v", err)
			return 0, err
		}
		log.Printf("[vendor] no match for gstin=%q — creating new vendor", gstinUIN)
	} else {
		log.Printf("[vendor] no GSTIN provided — creating new vendor")
	}

	// Create new vendor
	err := tx.QueryRow(`
		INSERT INTO vendors (vendor_name, gstin_uin)
		VALUES ($1, $2)
		RETURNING id`,
		vendorName, gstinUIN,
	).Scan(&vendorID)
	if err != nil {
		log.Printf("[vendor] ERROR creating vendor: %v", err)
		return 0, err
	}
	log.Printf("[vendor] CREATED new vendor id=%d  name=%q  gstin=%q", vendorID, vendorName, gstinUIN)
	return vendorID, nil
}

func parseID(r *http.Request, key string) (int, error) {
	return strconv.Atoi(mux.Vars(r)[key])
}
