# IMS — Inventory Management System
## Technical Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Project File Structure](#3-project-file-structure)
4. [Database Schema](#4-database-schema)
5. [Data Structures](#5-data-structures)
6. [API Reference](#6-api-reference)
7. [Frontend → Backend Communication](#7-frontend--backend-communication)
8. [Backend → Database Communication](#8-backend--database-communication)
9. [Full Request Lifecycle Flows](#9-full-request-lifecycle-flows)
10. [Frontend Component Map](#10-frontend-component-map)
11. [Vendor Deduplication Logic](#11-vendor-deduplication-logic)

---

## 1. System Overview

IMS is a web-based inventory management system for tracking vendors, purchase invoices, and invoice line items (products). Employees submit invoices through a form; the backend automatically handles vendor deduplication, invoice creation, and product storage in a single atomic transaction.

| Layer     | Technology              | Port  |
|-----------|-------------------------|-------|
| Frontend  | React 19 + Tailwind v4  | 5173  |
| Backend   | Go (net/http + gorilla/mux) | 8080 |
| Database  | PostgreSQL              | 5432  |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│   React SPA (localhost:5173)                                │
│   ┌──────────┐  fetch()  ┌──────────────────────────────┐  │
│   │  src/    │ ────────► │  http://localhost:8080/api/  │  │
│   │  api.js  │ ◄──────── │                              │  │
│   └──────────┘   JSON    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                    │
                          Go Backend (main.go)
                          ┌──────────────────┐
                          │  corsMiddleware   │  ← handles OPTIONS preflight
                          │  loggingMiddleware│  ← logs every request
                          │  gorilla/mux      │  ← routes to handlers
                          └──────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             handlers/        handlers/        handlers/
             invoices.go      products.go      search.go
                    │               │               │
                    └───────────────┴───────────────┘
                                    │
                              db package
                          ┌──────────────────┐
                          │  db.go  (pool)   │
                          │  migrate.go (DDL)│
                          └──────────────────┘
                                    │
                          PostgreSQL :5432
                          database: IMS_System
                    ┌───────────────────────────┐
                    │  vendors                  │
                    │  invoices                 │
                    │  invoice_items            │
                    └───────────────────────────┘
```

---

## 3. Project File Structure

### Backend — `IMS/Backend/`

```
Backend/
├── main.go                  Entry point. Connects DB, runs migrations,
│                            registers all routes, starts HTTP server on :8080.
│                            Applies corsMiddleware and loggingMiddleware.
│
├── go.mod                   Go module definition. Dependencies:
│                              - github.com/gorilla/mux  (HTTP router)
│                              - github.com/lib/pq       (PostgreSQL driver)
│
├── db/
│   ├── db.go                Opens and holds the global *sql.DB connection pool.
│   │                        Reads config from env vars with fallbacks:
│   │                          DB_HOST=localhost, DB_PORT=5432,
│   │                          DB_USER=postgres, DB_PASSWORD=1234,
│   │                          DB_NAME=IMS_System
│   │
│   └── migrate.go           Runs CREATE TABLE IF NOT EXISTS for all three tables
│                            and ALTER TABLE to widen numeric columns.
│                            Called once on every server startup (idempotent).
│
├── models/
│   └── models.go            All Go structs with JSON tags.
│                            Defines: Vendor, Invoice, InvoiceItem,
│                            CreateInvoiceRequest, InvoiceItemInput,
│                            UpdateProductRequest, SearchResult, InvoiceWithItems.
│
└── handlers/
    ├── invoices.go          Handles: GET /api/invoices, POST /api/invoices,
    │                        GET /api/invoices/:id, DELETE /api/invoices/:id.
    │                        Contains findOrCreateVendor() logic.
    │
    ├── products.go          Handles: PUT /api/products/:id,
    │                        DELETE /api/products/:id.
    │
    ├── search.go            Handles: GET /api/search?q=
    │                        Searches invoice_items and invoices tables
    │                        using LIKE pattern matching.
    │
    └── helpers.go           Shared respondJSON() and respondError() utilities.
```

### Frontend — `IMS/Frontend/src/`

```
src/
├── main.jsx                 React DOM entry point. Mounts <App />.
│
├── App.jsx                  Root component. Sets up BrowserRouter and
│                            renders <Home /> at route "/".
│
├── api.js                   Single HTTP client module. All fetch() calls
│                            to the backend go through here.
│                            Base URL: http://localhost:8080/api
│                            Exports: api.listInvoices, createInvoice,
│                            getInvoice, deleteInvoice, updateProduct,
│                            deleteProduct, search.
│
└── components/
    ├── home.jsx             Main page. Owns the global invoices[] state.
    │                        Fetches from DB on mount via api.listInvoices().
    │                        Groups invoices by vendor_id using groupByVendor().
    │                        Renders: navbar, SearchBar, VendorGroup list,
    │                        Add Invoice modal, toast notifications.
    │
    ├── VendorGroup.jsx      Renders one vendor card containing all its invoices.
    │                        Contains InvoiceBlock (inner component) for each invoice.
    │                        Each product row is clickable → opens ProductDetailModal.
    │                        Handles invoice delete confirmation.
    │
    ├── InvoiceForm.jsx      2-step form inside a Modal:
    │                          Step 1: Invoice header fields
    │                          Step 2: One or more product rows
    │                        On submit → calls api.createInvoice().
    │
    ├── ProductDetailModal.jsx  Full-screen modal showing all product fields.
    │                           Has 3 internal modes: view / edit / confirm-delete.
    │                           Edit mode embeds EditProductForm.
    │                           Calls api.updateProduct() and api.deleteProduct().
    │
    ├── EditProductForm.jsx  Form for editing product fields.
    │                        Used inside ProductDetailModal.
    │                        Calls api.updateProduct() on submit.
    │
    ├── SearchBar.jsx        Debounced search input (400ms delay).
    │                        Calls api.search() on each keystroke.
    │                        Passes results up to home.jsx via onResults().
    │
    ├── SearchResults.jsx    Renders search hits split into Invoices / Products.
    │                        Product rows are clickable → opens ProductDetailModal.
    │
    ├── Modal.jsx            Generic overlay wrapper. Closes on Escape key
    │                        or backdrop click. Supports wide prop for wider panels.
    │
    └── Field.jsx            Reusable labelled <input> or <select> component.
                             Used in InvoiceForm and EditProductForm.
```

---

## 4. Database Schema

### Table: `vendors`

| Column       | Type                    | Notes                        |
|--------------|-------------------------|------------------------------|
| id           | SERIAL PRIMARY KEY      |                              |
| vendor_name  | VARCHAR(255) NOT NULL   |                              |
| gstin_uin    | VARCHAR(50)             | Used as dedup key            |
| address      | TEXT                    |                              |
| phone        | VARCHAR(20)             |                              |
| email        | VARCHAR(255)            |                              |
| created_at   | TIMESTAMP               | DEFAULT CURRENT_TIMESTAMP    |

**Indexes:** `idx_vendors_name` on `vendor_name`, `idx_vendors_gstin` on `gstin_uin`

---

### Table: `invoices`

| Column          | Type               | Notes                              |
|-----------------|--------------------|------------------------------------|
| id              | SERIAL PRIMARY KEY |                                    |
| vendor_id       | INTEGER            | FK → vendors(id) ON DELETE CASCADE |
| invoice_num     | VARCHAR(100)       |                                    |
| invoice_date    | DATE               |                                    |
| internal_ref    | VARCHAR(100)       |                                    |
| total_tax       | NUMERIC(12,2)      | Sum of all item total_tax          |
| total_amount    | NUMERIC(12,2)      | Sum of all item total_amount       |
| invoice_img_url | TEXT               |                                    |
| registered_at   | TIMESTAMP          | DEFAULT CURRENT_TIMESTAMP          |

**Indexes:** `idx_invoices_vendor` on `vendor_id`

---

### Table: `invoice_items`

| Column           | Type               | Notes                               |
|------------------|--------------------|-------------------------------------|
| id               | SERIAL PRIMARY KEY |                                     |
| invoice_id       | INTEGER            | FK → invoices(id) ON DELETE CASCADE |
| item_description | TEXT               |                                     |
| ledger_account   | VARCHAR(255)       |                                     |
| qty              | NUMERIC(12,2)      |                                     |
| unit             | VARCHAR(50)        |                                     |
| item_rate        | NUMERIC(15,2)      |                                     |
| amount           | NUMERIC(15,2)      | qty × item_rate                     |
| hsn_sac          | VARCHAR(50)        |                                     |
| cgst             | NUMERIC(12,2)      | % rate                              |
| sgst             | NUMERIC(12,2)      | % rate                              |
| igst             | NUMERIC(12,2)      | % rate                              |
| total_tax        | NUMERIC(15,2)      | Computed tax amount in ₹            |
| total_amount     | NUMERIC(15,2)      | amount + total_tax                  |

**Indexes:** `idx_items_invoice` on `invoice_id`

---

### Entity Relationship

```
vendors (1) ──────< invoices (1) ──────< invoice_items
  id                 id                    id
  vendor_name        vendor_id  ──FK──►    invoice_id  ──FK──►
  gstin_uin          invoice_num           item_description
  ...                invoice_date          qty, unit, item_rate
                     total_amount          cgst, sgst, igst
                     ...                   total_tax, total_amount
```

---

## 5. Data Structures

All data exchanged between frontend and backend is JSON. The Go structs in `models/models.go` define the canonical shapes.

### Vendor (DB record)
```json
{
  "id": 4,
  "vendor_name": "ABC Traders",
  "gstin_uin": "07ABCDE1234F1Z5",
  "address": "",
  "phone": "",
  "email": "",
  "created_at": "2026-05-14T11:00:00Z"
}
```

### InvoiceItem (DB record / API response)
```json
{
  "id": 12,
  "invoice_id": 7,
  "item_description": "HP Laptop",
  "ledger_account": "Electronics",
  "qty": 2,
  "unit": "pcs",
  "item_rate": 55000,
  "amount": 110000,
  "hsn_sac": "8471",
  "cgst": 9,
  "sgst": 9,
  "igst": 0,
  "total_tax": 19800,
  "total_amount": 129800
}
```

### InvoiceWithItems (primary API response shape)
```json
{
  "id": 7,
  "vendor_id": 4,
  "vendor_name": "ABC Traders",
  "gstin_uin": "07ABCDE1234F1Z5",
  "invoice_num": "INV-102",
  "invoice_date": "2026-05-14",
  "internal_ref": "INT-5002",
  "total_tax": 20250,
  "total_amount": 132750,
  "invoice_img_url": "bucket/invoices/inv102.png",
  "registered_at": "2026-05-14T11:18:00Z",
  "items": [ ...InvoiceItem[] ]
}
```

### CreateInvoiceRequest (POST /api/invoices body)
```json
{
  "invoice_date": "2026-05-14",
  "vendor_name": "ABC Traders",
  "gstin_uin": "07ABCDE1234F1Z5",
  "invoice_num": "INV-102",
  "internal_ref": "INT-5002",
  "invoice_img_url": "bucket/invoices/inv102.png",
  "items": [
    {
      "item_description": "HP Laptop",
      "ledger_account": "Electronics",
      "qty": 2,
      "unit": "pcs",
      "item_rate": 55000,
      "amount": 110000,
      "hsn_sac": "8471",
      "cgst": 9,
      "sgst": 9,
      "igst": 0,
      "total_tax": 19800,
      "total_amount": 129800
    }
  ]
}
```

### UpdateProductRequest (PUT /api/products/:id body)
```json
{
  "item_description": "HP Laptop Pro",
  "qty": 3,
  "item_rate": 53000,
  "amount": 159000,
  "cgst": 9,
  "sgst": 9,
  "igst": 0,
  "total_tax": 28620,
  "total_amount": 187620
}
```
> Only non-zero fields are applied. Omitted fields retain their current DB value.

### SearchResponse (GET /api/search response)
```json
{
  "query": "laptop",
  "count": 2,
  "results": [
    {
      "type": "product",
      "payload": { ...InvoiceItem }
    },
    {
      "type": "invoice",
      "payload": { ...InvoiceWithItems (no items array) }
    }
  ]
}
```

### Error Response (all endpoints on failure)
```json
{
  "error": "Human-readable error message"
}
```

---

## 6. API Reference

Base URL: `http://localhost:8080/api`

All requests and responses use `Content-Type: application/json`.

---

### GET `/api/invoices`

Returns all invoices with their items, ordered newest first.

**Response `200`:** `InvoiceWithItems[]`

```json
[
  {
    "id": 7,
    "vendor_id": 4,
    "vendor_name": "ABC Traders",
    "gstin_uin": "07ABCDE1234F1Z5",
    "invoice_num": "INV-102",
    "invoice_date": "2026-05-14T00:00:00Z",
    "internal_ref": "INT-5002",
    "total_tax": 20250,
    "total_amount": 132750,
    "invoice_img_url": "",
    "registered_at": "2026-05-14T11:18:00Z",
    "items": [ ...InvoiceItem[] ]
  }
]
```

---

### POST `/api/invoices`

Creates a vendor (or reuses existing by GSTIN), creates the invoice, and inserts all items in a single transaction.

**Request body:** `CreateInvoiceRequest`

**Response `201`:** `InvoiceWithItems` (the newly created invoice with all items)

**Response `400`:** Missing `vendor_name` or empty `items` array

**Response `500`:** DB error

---

### GET `/api/invoices/:id`

Returns a single invoice with all its items.

**Response `200`:** `InvoiceWithItems`

**Response `404`:** Invoice not found

---

### DELETE `/api/invoices/:id`

Deletes the invoice. All invoice_items are removed automatically via `ON DELETE CASCADE`.

**Response `200`:**
```json
{ "message": "Invoice and all its items deleted successfully" }
```

**Response `404`:** Invoice not found

---

### PUT `/api/products/:id`

Updates editable fields on a single invoice item. Only non-zero fields in the request body are applied.

**Request body:** `UpdateProductRequest`

**Response `200`:** Updated `InvoiceItem`

**Response `404`:** Product not found

---

### DELETE `/api/products/:id`

Removes a single invoice item without affecting the parent invoice.

**Response `200`:**
```json
{ "message": "Product deleted successfully" }
```

**Response `404`:** Product not found

---

### GET `/api/search?q=<query>`

Case-insensitive LIKE search across products and invoices.

**Searched fields:**

| Table          | Fields searched                                      |
|----------------|------------------------------------------------------|
| invoice_items  | item_description, ledger_account, hsn_sac, qty, amount |
| invoices       | invoice_num, internal_ref, invoice_date              |
| vendors        | vendor_name, gstin_uin                               |

**Response `200`:** `SearchResponse`

**Response `400`:** Missing `q` parameter

---

## 7. Frontend → Backend Communication

All HTTP calls are centralised in `src/api.js`. Components never call `fetch()` directly.

```
Component                api.js call              HTTP Request
─────────────────────────────────────────────────────────────────
home.jsx (on mount)      api.listInvoices()       GET  /api/invoices
home.jsx (refresh btn)   api.listInvoices()       GET  /api/invoices

InvoiceForm.jsx          api.createInvoice(body)  POST /api/invoices

VendorGroup.jsx          api.deleteInvoice(id)    DELETE /api/invoices/:id

ProductDetailModal.jsx   api.updateProduct(id,b)  PUT  /api/products/:id
ProductDetailModal.jsx   api.deleteProduct(id)    DELETE /api/products/:id

SearchBar.jsx            api.search(q)            GET  /api/search?q=...
SearchResults.jsx        (opens ProductDetailModal, which calls above)
```

### Request Headers (all requests)
```
Content-Type: application/json
```

### CORS
The backend sets these headers on every response:
```
Access-Control-Allow-Origin:  *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```
OPTIONS preflight requests are answered with `204 No Content` before reaching the router.

---

## 8. Backend → Database Communication

The backend uses `database/sql` with the `lib/pq` PostgreSQL driver. A single global connection pool (`db.DB`) is shared across all handlers.

### Connection config (`db/db.go`)

| Env Var     | Default     |
|-------------|-------------|
| DB_HOST     | localhost   |
| DB_PORT     | 5432        |
| DB_USER     | postgres    |
| DB_PASSWORD | 1234        |
| DB_NAME     | IMS_System  |

### Query map

| Handler function  | SQL operations                                                  |
|-------------------|-----------------------------------------------------------------|
| ListInvoices      | SELECT invoices JOIN vendors; SELECT invoice_items per invoice  |
| CreateInvoice     | BEGIN; SELECT vendors (GSTIN lookup); INSERT vendors (if new);  |
|                   | INSERT invoices; INSERT invoice_items ×N; COMMIT                |
| GetInvoice        | SELECT invoices JOIN vendors WHERE id; SELECT invoice_items     |
| DeleteInvoice     | DELETE invoices WHERE id (CASCADE removes items)                |
| UpdateProduct     | SELECT invoice_items WHERE id; UPDATE invoice_items WHERE id    |
| DeleteProduct     | DELETE invoice_items WHERE id                                   |
| Search            | SELECT invoice_items WHERE LIKE; SELECT invoices JOIN vendors WHERE LIKE |

---

## 9. Full Request Lifecycle Flows

### Flow A — Load page (GET /api/invoices)

```
Browser loads localhost:5173
  │
  ▼
home.jsx useEffect fires
  │
  ▼
api.listInvoices()
  │  GET /api/invoices
  ▼
loggingMiddleware → corsMiddleware → mux router
  │
  ▼
handlers.ListInvoices()
  │
  ├─► SELECT invoices JOIN vendors ORDER BY registered_at DESC
  │     → []InvoiceWithItems (no items yet)
  │
  └─► for each invoice:
        SELECT invoice_items WHERE invoice_id = $1
        → appends items to each invoice
  │
  ▼
respondJSON(200, []InvoiceWithItems)
  │
  ▼
home.jsx setInvoices(data)
  │
  ▼
useMemo groupByVendor(invoices)
  → groups by vendor_id into VendorGroup[]
  │
  ▼
Renders VendorGroup cards
```

---

### Flow B — Create Invoice (POST /api/invoices)

```
User fills InvoiceForm (Step 1: header, Step 2: products)
  │
  ▼
api.createInvoice(payload)
  │  POST /api/invoices
  │  Body: CreateInvoiceRequest
  ▼
handlers.CreateInvoice()
  │
  ├─► BEGIN transaction
  │
  ├─► findOrCreateVendor(vendorName, gstinUIN)
  │     │
  │     ├─ if gstinUIN != "":
  │     │    SELECT id FROM vendors WHERE gstin_uin = $1
  │     │    ├─ found  → return existing vendor_id
  │     │    └─ not found → INSERT vendors → return new vendor_id
  │     │
  │     └─ if gstinUIN == "":
  │          INSERT vendors → return new vendor_id
  │
  ├─► INSERT invoices (vendor_id, invoice_num, ...) RETURNING id
  │
  ├─► for each item in request:
  │     INSERT invoice_items (invoice_id, ...) RETURNING id
  │
  ├─► COMMIT
  │
  ▼
respondJSON(201, InvoiceWithItems)
  │
  ▼
home.jsx handleInvoiceCreated(invoice)
  → setInvoices([newInvoice, ...prev])
  → groupByVendor re-runs via useMemo
  → UI updates instantly (no re-fetch needed)
```

---

### Flow C — Edit Product (PUT /api/products/:id)

```
User clicks product row in VendorGroup
  │
  ▼
ProductDetailModal opens (mode = "view")
  │
User clicks Edit button
  │
  ▼
mode = "edit" → EditProductForm renders
  │
User changes fields → clicks Save
  │
  ▼
api.updateProduct(id, payload)
  │  PUT /api/products/:id
  │  Body: UpdateProductRequest (only changed fields)
  ▼
handlers.UpdateProduct()
  │
  ├─► SELECT invoice_items WHERE id = $1  (fetch current values)
  ├─► merge: non-zero request fields override current values
  └─► UPDATE invoice_items SET ... WHERE id = $1
  │
  ▼
respondJSON(200, InvoiceItem)
  │
  ▼
ProductDetailModal handleUpdated(updated)
  → mode = "view", shows updated data
  → onUpdated(updated) bubbles to VendorGroup → home.jsx
  → home.jsx updates invoices[] state in-place
```

---

### Flow D — Delete Invoice (DELETE /api/invoices/:id)

```
User clicks Delete on invoice header in VendorGroup
  │
  ▼
Confirm modal appears
  │
User confirms
  │
  ▼
api.deleteInvoice(id)
  │  DELETE /api/invoices/:id
  ▼
handlers.DeleteInvoice()
  │
  └─► DELETE FROM invoices WHERE id = $1
        PostgreSQL CASCADE → also deletes all invoice_items
  │
  ▼
respondJSON(200, { message: "..." })
  │
  ▼
VendorGroup onInvoiceDeleted(id)
  → home.jsx setInvoices(prev.filter(inv => inv.id !== id))
  → if vendor has no more invoices, VendorGroup disappears from UI
```

---

### Flow E — Search (GET /api/search?q=)

```
User types in SearchBar (debounced 400ms)
  │
  ▼
api.search(q)
  │  GET /api/search?q=laptop
  ▼
handlers.Search()
  │
  ├─► SELECT invoice_items WHERE
  │     LOWER(item_description) LIKE '%laptop%'
  │     OR LOWER(ledger_account) LIKE '%laptop%'
  │     OR LOWER(hsn_sac) LIKE '%laptop%'
  │     OR CAST(qty AS TEXT) LIKE '%laptop%'
  │     OR CAST(amount AS TEXT) LIKE '%laptop%'
  │     LIMIT 50
  │
  └─► SELECT invoices JOIN vendors WHERE
        LOWER(invoice_num) LIKE '%laptop%'
        OR LOWER(internal_ref) LIKE '%laptop%'
        OR LOWER(vendor_name) LIKE '%laptop%'
        OR LOWER(gstin_uin) LIKE '%laptop%'
        OR CAST(invoice_date AS TEXT) LIKE '%laptop%'
        LIMIT 50
  │
  ▼
respondJSON(200, { query, count, results: SearchResult[] })
  │
  ▼
SearchBar onResults(data) → home.jsx setSearchData / setIsSearching
  │
  ▼
SearchResults renders:
  - Invoice hits as info cards
  - Product hits as clickable rows → ProductDetailModal on click
```

---

## 10. Frontend Component Map

```
App.jsx
└── BrowserRouter
    └── Route "/"
        └── home.jsx  [state: invoices[], loading, searchData]
            │
            ├── <header>
            │   ├── SearchBar.jsx  ──api.search()──► backend
            │   └── "+ Add Invoice" button
            │
            ├── <main>
            │   ├── [isSearching=true]
            │   │   └── SearchResults.jsx
            │   │       └── ProductDetailModal.jsx (on product click)
            │   │           └── EditProductForm.jsx (in edit mode)
            │   │
            │   └── [isSearching=false]
            │       └── VendorGroup.jsx  (one per vendor_id)
            │           ├── vendor header (name, GSTIN, stats)
            │           └── InvoiceBlock  (one per invoice)  [inner component]
            │               ├── invoice header bar (num, date, total, Delete)
            │               └── product rows (clickable)
            │                   └── ProductDetailModal.jsx (on row click)
            │                       └── EditProductForm.jsx (in edit mode)
            │
            └── Modal.jsx  (wraps InvoiceForm when showForm=true)
                └── InvoiceForm.jsx
                    ├── Step 1: invoice header fields (Field.jsx ×6)
                    └── Step 2: product rows (Field.jsx ×12 per product)
                        └── api.createInvoice() on submit
```

---

## 11. Vendor Deduplication Logic

Located in `handlers/invoices.go` → `findOrCreateVendor()`.

```
Incoming request has gstin_uin?
│
├── YES (gstin_uin != "")
│     │
│     └── SELECT id FROM vendors WHERE gstin_uin = $1 LIMIT 1
│           │
│           ├── Row found  ──► use existing vendor_id
│           │                  (vendor_name from form is IGNORED)
│           │
│           └── No row    ──► INSERT vendors(vendor_name, gstin_uin)
│                              return new vendor_id
│
└── NO (gstin_uin == "")
      │
      └── Always INSERT new vendor
          (no name-based deduplication)
```

**Key behaviour:** The canonical vendor name shown in the UI is always the name that was stored when the vendor was first created. Subsequent invoices with the same GSTIN but a different name spelling will be linked to the original vendor record — the new name is not saved.

---

*Generated from source — IMS v1.0 — May 2026*
