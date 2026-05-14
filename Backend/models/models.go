package models

import "time"

// Vendor represents a supplier/vendor record.
type Vendor struct {
	ID         int       `json:"id"`
	VendorName string    `json:"vendor_name"`
	GstinUIN   string    `json:"gstin_uin"`
	Address    string    `json:"address"`
	Phone      string    `json:"phone"`
	Email      string    `json:"email"`
	CreatedAt  time.Time `json:"created_at"`
}

// Invoice represents a purchase invoice.
type Invoice struct {
	ID             int       `json:"id"`
	VendorID       int       `json:"vendor_id"`
	InvoiceNum     string    `json:"invoice_num"`
	InvoiceDate    string    `json:"invoice_date"` // "YYYY-MM-DD"
	InternalRef    string    `json:"internal_ref"`
	TotalTax       float64   `json:"total_tax"`
	TotalAmount    float64   `json:"total_amount"`
	InvoiceImgURL  string    `json:"invoice_img_url"`
	RegisteredAt   time.Time `json:"registered_at"`
}

// InvoiceItem represents a single line item on an invoice.
type InvoiceItem struct {
	ID              int     `json:"id"`
	InvoiceID       int     `json:"invoice_id"`
	ItemDescription string  `json:"item_description"`
	LedgerAccount   string  `json:"ledger_account"`
	Qty             float64 `json:"qty"`
	Unit            string  `json:"unit"`
	ItemRate        float64 `json:"item_rate"`
	Amount          float64 `json:"amount"`
	HsnSac          string  `json:"hsn_sac"`
	CGST            float64 `json:"cgst"`
	SGST            float64 `json:"sgst"`
	IGST            float64 `json:"igst"`
	TotalTax        float64 `json:"total_tax"`
	TotalAmount     float64 `json:"total_amount"`
}

// ---- Request / Response shapes ----

// CreateInvoiceRequest is the payload for POST /api/invoices.
type CreateInvoiceRequest struct {
	InvoiceDate   string              `json:"invoice_date"`
	VendorName    string              `json:"vendor_name"`
	GstinUIN      string              `json:"gstin_uin"`
	InvoiceNum    string              `json:"invoice_num"`
	InternalRef   string              `json:"internal_ref"`
	InvoiceImgURL string              `json:"invoice_img_url"`
	Items         []InvoiceItemInput  `json:"items"`
}

// InvoiceItemInput is a single item within CreateInvoiceRequest.
type InvoiceItemInput struct {
	ItemDescription string  `json:"item_description"`
	LedgerAccount   string  `json:"ledger_account"`
	Qty             float64 `json:"qty"`
	Unit            string  `json:"unit"`
	ItemRate        float64 `json:"item_rate"`
	Amount          float64 `json:"amount"`
	HsnSac          string  `json:"hsn_sac"`
	CGST            float64 `json:"cgst"`
	SGST            float64 `json:"sgst"`
	IGST            float64 `json:"igst"`
	TotalTax        float64 `json:"total_tax"`
	TotalAmount     float64 `json:"total_amount"`
}

// UpdateProductRequest is the payload for PUT /api/products/:id.
type UpdateProductRequest struct {
	ItemDescription string  `json:"item_description"`
	Qty             float64 `json:"qty"`
	ItemRate        float64 `json:"item_rate"`
	Amount          float64 `json:"amount"`
	CGST            float64 `json:"cgst"`
	SGST            float64 `json:"sgst"`
	IGST            float64 `json:"igst"`
	TotalTax        float64 `json:"total_tax"`
	TotalAmount     float64 `json:"total_amount"`
}

// SearchResult is a unified search hit returned by GET /api/search.
type SearchResult struct {
	Type    string      `json:"type"`    // "invoice" | "product"
	Payload interface{} `json:"payload"`
}

// InvoiceWithItems is the full invoice response including its line items.
type InvoiceWithItems struct {
	Invoice
	VendorName string        `json:"vendor_name"`
	GstinUIN   string        `json:"gstin_uin"`
	Items      []InvoiceItem `json:"items"`
}
