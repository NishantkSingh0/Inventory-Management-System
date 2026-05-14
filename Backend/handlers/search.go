package handlers

import (
	"Backend/db"
	"Backend/models"
	"net/http"
	"strings"
)

// GET /api/search?q=<query>
//
// Searches across:
//   - invoice_items: item_description, ledger_account, hsn_sac
//   - invoices:      invoice_num, internal_ref
//   - vendors:       vendor_name, gstin_uin
//
// Returns a unified list of hits tagged with their type.
func Search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		respondError(w, http.StatusBadRequest, "query parameter 'q' is required")
		return
	}

	pattern := "%" + strings.ToLower(q) + "%"
	results := make([]models.SearchResult, 0)

	// --- Search invoice items (products) ---
	itemRows, err := db.DB.Query(`
		SELECT ii.id, ii.invoice_id, ii.item_description, ii.ledger_account,
		       ii.qty, ii.unit, ii.item_rate, ii.amount, ii.hsn_sac,
		       ii.cgst, ii.sgst, ii.igst, ii.total_tax, ii.total_amount
		FROM invoice_items ii
		WHERE LOWER(ii.item_description) LIKE $1
		   OR LOWER(ii.ledger_account)   LIKE $1
		   OR LOWER(ii.hsn_sac)          LIKE $1
		   OR CAST(ii.qty AS TEXT)        LIKE $1
		   OR CAST(ii.amount AS TEXT)     LIKE $1
		LIMIT 50`, pattern)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Search failed (items): "+err.Error())
		return
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var item models.InvoiceItem
		if err := itemRows.Scan(
			&item.ID, &item.InvoiceID, &item.ItemDescription, &item.LedgerAccount,
			&item.Qty, &item.Unit, &item.ItemRate, &item.Amount, &item.HsnSac,
			&item.CGST, &item.SGST, &item.IGST, &item.TotalTax, &item.TotalAmount,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		results = append(results, models.SearchResult{Type: "product", Payload: item})
	}

	// --- Search invoices (joined with vendor) ---
	invRows, err := db.DB.Query(`
		SELECT i.id, i.vendor_id, v.vendor_name, v.gstin_uin,
		       i.invoice_num, i.invoice_date, i.internal_ref,
		       i.total_tax, i.total_amount, i.invoice_img_url, i.registered_at
		FROM invoices i
		JOIN vendors v ON v.id = i.vendor_id
		WHERE LOWER(i.invoice_num)   LIKE $1
		   OR LOWER(i.internal_ref)  LIKE $1
		   OR LOWER(v.vendor_name)   LIKE $1
		   OR LOWER(v.gstin_uin)     LIKE $1
		   OR CAST(i.invoice_date AS TEXT) LIKE $1
		LIMIT 50`, pattern)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Search failed (invoices): "+err.Error())
		return
	}
	defer invRows.Close()

	for invRows.Next() {
		var inv models.InvoiceWithItems
		if err := invRows.Scan(
			&inv.ID, &inv.VendorID, &inv.VendorName, &inv.GstinUIN,
			&inv.InvoiceNum, &inv.InvoiceDate, &inv.InternalRef,
			&inv.TotalTax, &inv.TotalAmount, &inv.InvoiceImgURL, &inv.RegisteredAt,
		); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		results = append(results, models.SearchResult{Type: "invoice", Payload: inv})
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"query":   q,
		"count":   len(results),
		"results": results,
	})
}
