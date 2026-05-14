package main

import (
	"Backend/db"
	"Backend/handlers"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// corsMiddleware wraps the entire handler — runs before mux route matching,
// so OPTIONS preflights are answered even when no route is registered for them.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// loggingMiddleware prints every request method, path, and duration.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(wrapped, r)
		log.Printf("%s %s → %d (%s)", r.Method, r.URL.Path, wrapped.status, time.Since(start))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func main() {
	// 1. Connect to PostgreSQL
	db.Connect()

	// 2. Run schema migrations (idempotent — safe to run every startup)
	db.Migrate()

	// 3. Register routes
	r := mux.NewRouter()
	api := r.PathPrefix("/api").Subrouter()

	// Invoices
	api.HandleFunc("/invoices", handlers.ListInvoices).Methods(http.MethodGet)
	api.HandleFunc("/invoices", handlers.CreateInvoice).Methods(http.MethodPost)
	api.HandleFunc("/invoices/{id:[0-9]+}", handlers.GetInvoice).Methods(http.MethodGet)
	api.HandleFunc("/invoices/{id:[0-9]+}", handlers.DeleteInvoice).Methods(http.MethodDelete)

	// Products (invoice items)
	api.HandleFunc("/products/{id:[0-9]+}", handlers.UpdateProduct).Methods(http.MethodPut)
	api.HandleFunc("/products/{id:[0-9]+}", handlers.DeleteProduct).Methods(http.MethodDelete)

	// Search
	api.HandleFunc("/search", handlers.Search).Methods(http.MethodGet)

	// 4. Start server — CORS wraps the router, logging wraps CORS
	addr := ":8080"
	log.Printf("IMS Backend listening on %s", addr)
	if err := http.ListenAndServe(addr, loggingMiddleware(corsMiddleware(r))); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
