package handlers

import (
	"Backend/db"
	"Backend/models"
	"database/sql"
	"encoding/json"
	"net/http"
)

// PUT /api/products/:id
// Updates editable fields on a single invoice item.
func UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid product id")
		return
	}

	var req models.UpdateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Fetch current record so we can keep unchanged fields intact
	var current models.InvoiceItem
	err = db.DB.QueryRow(`
		SELECT id, invoice_id, item_description, ledger_account,
		       qty, unit, item_rate, amount, hsn_sac,
		       cgst, sgst, igst, total_tax, total_amount
		FROM invoice_items WHERE id = $1`, id,
	).Scan(
		&current.ID, &current.InvoiceID, &current.ItemDescription, &current.LedgerAccount,
		&current.Qty, &current.Unit, &current.ItemRate, &current.Amount, &current.HsnSac,
		&current.CGST, &current.SGST, &current.IGST, &current.TotalTax, &current.TotalAmount,
	)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Product not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Apply only the fields that were provided (non-zero values override)
	if req.ItemDescription != "" {
		current.ItemDescription = req.ItemDescription
	}
	if req.Qty != 0 {
		current.Qty = req.Qty
	}
	if req.ItemRate != 0 {
		current.ItemRate = req.ItemRate
	}
	if req.Amount != 0 {
		current.Amount = req.Amount
	}
	if req.CGST != 0 {
		current.CGST = req.CGST
	}
	if req.SGST != 0 {
		current.SGST = req.SGST
	}
	if req.IGST != 0 {
		current.IGST = req.IGST
	}
	if req.TotalTax != 0 {
		current.TotalTax = req.TotalTax
	}
	if req.TotalAmount != 0 {
		current.TotalAmount = req.TotalAmount
	}

	_, err = db.DB.Exec(`
		UPDATE invoice_items SET
			item_description = $1,
			qty              = $2,
			item_rate        = $3,
			amount           = $4,
			cgst             = $5,
			sgst             = $6,
			igst             = $7,
			total_tax        = $8,
			total_amount     = $9
		WHERE id = $10`,
		current.ItemDescription, current.Qty, current.ItemRate, current.Amount,
		current.CGST, current.SGST, current.IGST, current.TotalTax, current.TotalAmount,
		id,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update product: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, current)
}

// DELETE /api/products/:id
// Removes a single invoice item.
func DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid product id")
		return
	}

	res, err := db.DB.Exec(`DELETE FROM invoice_items WHERE id = $1`, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete product: "+err.Error())
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		respondError(w, http.StatusNotFound, "Product not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Product deleted successfully"})
}
