import { useState, useEffect } from "react";
import EditProductForm from "./EditProductForm";
import { api } from "../api";

function fmt(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wide font-medium w-32 shrink-0">{label}</span>
      <span className={`text-sm text-gray-800 text-right ${mono ? "font-mono" : "font-medium"}`}>{value ?? "—"}</span>
    </div>
  );
}

/**
 * ProductDetailModal
 *
 * Props:
 *   product   – InvoiceItem object
 *   onClose   – () => void
 *   onUpdated – (updatedProduct) => void
 *   onDeleted – (productId) => void
 */
export default function ProductDetailModal({ product: initialProduct, onClose, onUpdated, onDeleted }) {
  const [product, setProduct]         = useState(initialProduct);
  const [mode, setMode]               = useState("view");   // "view" | "edit"
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDeleted = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteProduct(product.id);
      onDeleted(product.id);
      onClose();
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  const handleUpdated = (updated) => {
    setProduct(updated);
    setMode("view");
    onUpdated(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Product</p>
            <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">
              {product.item_description}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {product.ledger_account && <span>{product.ledger_account}</span>}
              {product.hsn_sac && <span> · HSN {product.hsn_sac}</span>}
            </p>
          </div>

          {/* Action buttons top-right */}
          <div className="flex items-center gap-2 shrink-0">
            {mode === "view" && (
              <>
                <button
                  onClick={() => setMode("edit")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition text-xs font-semibold"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition text-xs font-semibold"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}
            {mode === "edit" && (
              <button
                onClick={() => setMode("view")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition text-xs font-semibold"
              >
                ← Back
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition text-xl leading-none ml-1"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-6 py-4 flex-1">

          {/* ── View mode ── */}
          {mode === "view" && !confirmDelete && (
            <div className="flex flex-col gap-5">
              {/* Amounts highlight */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-indigo-400 font-medium mb-1">Amount</p>
                  <p className="font-bold text-indigo-700 text-base">₹{fmt(product.amount)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-500 font-medium mb-1">Total Tax</p>
                  <p className="font-bold text-amber-700 text-base">₹{fmt(product.total_tax)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-500 font-medium mb-1">Total</p>
                  <p className="font-bold text-green-700 text-base">₹{fmt(product.total_amount)}</p>
                </div>
              </div>

              {/* Detail rows */}
              <div className="bg-gray-50 rounded-xl px-4 py-1">
                <Row label="Qty"       value={`${product.qty} ${product.unit || ""}`} />
                <Row label="Item Rate" value={`₹${fmt(product.item_rate)}`} mono />
                <Row label="HSN / SAC" value={product.hsn_sac} mono />
                <Row label="Ledger"    value={product.ledger_account} />
              </div>

              {/* Tax breakdown */}
              <div className="bg-gray-50 rounded-xl px-4 py-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium pt-2 pb-1">Tax Breakdown</p>
                <Row label="CGST" value={`${product.cgst}%`} mono />
                <Row label="SGST" value={`${product.sgst}%`} mono />
                <Row label="IGST" value={`${product.igst}%`} mono />
                <Row label="Total Tax" value={`₹${fmt(product.total_tax)}`} mono />
              </div>
            </div>
          )}

          {/* ── Confirm delete ── */}
          {mode === "view" && confirmDelete && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Delete this product?</p>
                <p className="text-sm text-gray-400 mt-1">
                  "{product.item_description}" will be permanently removed.
                </p>
              </div>
              {deleteError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 w-full">{deleteError}</p>
              )}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleted}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition"
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}

          {/* ── Edit mode ── */}
          {mode === "edit" && (
            <EditProductForm
              product={product}
              onClose={() => setMode("view")}
              onSuccess={handleUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
}
