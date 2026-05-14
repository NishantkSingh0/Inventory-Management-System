package db

import "log"

// Migrate runs all DDL statements to create tables if they don't exist.
func Migrate() {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS vendors (
			id          SERIAL PRIMARY KEY,
			vendor_name VARCHAR(255) NOT NULL,
			gstin_uin   VARCHAR(50),
			address     TEXT,
			phone       VARCHAR(20),
			email       VARCHAR(255),
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS invoices (
			id              SERIAL PRIMARY KEY,
			vendor_id       INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
			invoice_num     VARCHAR(100),
			invoice_date    DATE,
			internal_ref    VARCHAR(100),
			total_tax       NUMERIC(12,2),
			total_amount    NUMERIC(12,2),
			invoice_img_url TEXT,
			registered_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS invoice_items (
			id               SERIAL PRIMARY KEY,
			invoice_id       INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
			item_description TEXT,
			ledger_account   VARCHAR(255),
			qty              NUMERIC(10,2),
			unit             VARCHAR(50),
			item_rate        NUMERIC(12,2),
			amount           NUMERIC(12,2),
			hsn_sac          VARCHAR(50),
			cgst             NUMERIC(5,2),
			sgst             NUMERIC(5,2),
			igst             NUMERIC(5,2),
			total_tax        NUMERIC(12,2),
			total_amount     NUMERIC(12,2)
		)`,

		// Widen tax-rate columns that were originally NUMERIC(5,2).
		// NUMERIC(5,2) only holds up to 999.99 — tax amounts on large invoices overflow.
		// ALTER COLUMN TYPE is idempotent-safe: widening a numeric type never loses data.
		`ALTER TABLE invoice_items
			ALTER COLUMN cgst        TYPE NUMERIC(12,2),
			ALTER COLUMN sgst        TYPE NUMERIC(12,2),
			ALTER COLUMN igst        TYPE NUMERIC(12,2),
			ALTER COLUMN qty         TYPE NUMERIC(12,2),
			ALTER COLUMN item_rate   TYPE NUMERIC(15,2),
			ALTER COLUMN amount      TYPE NUMERIC(15,2),
			ALTER COLUMN total_tax   TYPE NUMERIC(15,2),
			ALTER COLUMN total_amount TYPE NUMERIC(15,2)`,

		// Index to speed up vendor lookup by name or GSTIN
		`CREATE INDEX IF NOT EXISTS idx_vendors_name    ON vendors(vendor_name)`,
		`CREATE INDEX IF NOT EXISTS idx_vendors_gstin   ON vendors(gstin_uin)`,
		`CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id)`,
		`CREATE INDEX IF NOT EXISTS idx_items_invoice   ON invoice_items(invoice_id)`,
	}

	for _, stmt := range statements {
		if _, err := DB.Exec(stmt); err != nil {
			log.Fatalf("Migration failed:\n%s\nError: %v", stmt, err)
		}
	}

	log.Println("Database migration completed successfully")
}
