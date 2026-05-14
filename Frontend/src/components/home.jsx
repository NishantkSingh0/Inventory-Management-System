import { useState, useEffect, useCallback, useMemo } from "react";
import Modal from "./Modal";
import InvoiceForm from "./InvoiceForm";
import VendorGroup from "./VendorGroup";
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";
import { api } from "../api";

/**
 * groupByVendor
 * Takes a flat list of invoices and returns an array of vendor groups,
 * each containing the canonical vendor name (first seen), GSTIN, and invoices.
 * Grouping key is vendor_id (set by the backend based on GSTIN match).
 */
function groupByVendor(invoices) {
  const map = new Map(); // vendor_id → { vendorId, vendorName, gstinUIN, invoices[] }

  for (const inv of invoices) {
    const key = inv.vendor_id;
    if (!map.has(key)) {
      map.set(key, {
        vendorId:   key,
        vendorName: inv.vendor_name, // canonical — first name stored in DB
        gstinUIN:   inv.gstin_uin,
        invoices:   [],
      });
    }
    map.get(key).invoices.push(inv);
  }

  // Sort groups: most recently active vendor first
  return Array.from(map.values());
}

export default function Home() {
  const [invoices, setInvoices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [searchData, setSearchData]   = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast]             = useState("");

  // Derive vendor groups whenever invoices change
  const vendorGroups = useMemo(() => groupByVendor(invoices), [invoices]);

  /* ── fetch all invoices from DB ── */
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.listInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError("Could not reach backend: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ── invoice created — backend already persisted it, just prepend ── */
  const handleInvoiceCreated = (invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
    setShowForm(false);
    showToast(`Invoice ${invoice.invoice_num} created`);
  };

  /* ── invoice deleted ── */
  const handleInvoiceDeleted = (invoiceId) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    showToast("Invoice deleted");
  };

  /* ── product updated ── */
  const handleProductUpdated = (invoiceId, updatedProduct) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id !== invoiceId
          ? inv
          : {
              ...inv,
              items: inv.items.map((item) =>
                item.id === updatedProduct.id ? updatedProduct : item
              ),
            }
      )
    );
    showToast("Product updated");
  };

  /* ── product deleted ── */
  const handleProductDeleted = (invoiceId, productId) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id !== invoiceId
          ? inv
          : { ...inv, items: inv.items.filter((item) => item.id !== productId) }
      )
    );
    showToast("Product deleted");
  };

  /* ── search ── */
  const handleSearchResults = (data) => {
    setSearchData(data);
    setIsSearching(true);
  };

  const handleSearchClear = () => {
    setSearchData(null);
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-lg">IMS</span>
          </div>

          <SearchBar onResults={handleSearchResults} onClear={handleSearchClear} />

          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:scale-95 transition shadow-sm whitespace-nowrap"
          >
            <span className="text-lg leading-none">+</span>
            Add Invoice
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-6 py-8">

        {isSearching ? (
          <SearchResults data={searchData} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-800">Vendors</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {loading
                    ? "Loading…"
                    : `${vendorGroups.length} vendor${vendorGroups.length !== 1 ? "s" : ""} · ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} total`}
                </p>
              </div>
              {/* Refresh button */}
              {!loading && (
                <button
                  onClick={loadInvoices}
                  className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition"
                  title="Reload from database"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <p className="text-sm">Loading invoices…</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {!loading && loadError && (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Backend unreachable</p>
                  <p className="text-sm text-gray-400 mt-1">{loadError}</p>
                </div>
                <button
                  onClick={loadInvoices}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !loadError && invoices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No invoices yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Invoice" to get started</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                >
                  + Add Invoice
                </button>
              </div>
            )}

            {/* Vendor groups */}
            {!loading && !loadError && invoices.length > 0 && (
              <div className="flex flex-col gap-6">
                {vendorGroups.map((group) => (
                  <VendorGroup
                    key={group.vendorId}
                    vendorId={group.vendorId}
                    vendorName={group.vendorName}
                    gstinUIN={group.gstinUIN}
                    invoices={group.invoices}
                    onInvoiceDeleted={handleInvoiceDeleted}
                    onProductUpdated={handleProductUpdated}
                    onProductDeleted={handleProductDeleted}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Add Invoice modal ── */}
      {showForm && (
        <Modal title="New Invoice" onClose={() => setShowForm(false)} wide>
          <InvoiceForm
            onClose={() => setShowForm(false)}
            onSuccess={handleInvoiceCreated}
          />
        </Modal>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
          bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
