import { useState } from "react";
import Modal from "./Modal";
import ProductDetailModal from "./ProductDetailModal";
import EditProductForm from "./EditProductForm";
import { api } from "../api";

function fmt(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

/* ── Single invoice card inside a vendor group ── */
function InvoiceBlock({ invoice, onDeleteInvoice, onSelectProduct }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">

      {/* Invoice header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-gray-400 hover:text-gray-600 transition shrink-0"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {invoice.invoice_num || "No Number"}
          </span>

          <span className="text-xs text-gray-400 shrink-0">{invoice.invoice_date?.slice(0, 10)}</span>

          {invoice.internal_ref && (
            <span className="text-xs text-gray-400 truncate hidden sm:block">
              Ref: {invoice.internal_ref}
            </span>
          )}

          <span className="text-xs text-gray-300 hidden sm:block">
            {invoice.items?.length ?? 0} item{invoice.items?.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-semibold text-gray-800 text-sm">₹{fmt(invoice.total_amount)}</span>
          <button
            onClick={() => onDeleteInvoice(invoice.id)}
            className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Products table — click row to open detail modal */}
      {!collapsed && invoice.items && invoice.items.length > 0 && (
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase bg-white border-b border-gray-100">
                <th className="text-left px-5 py-2.5 font-medium">Description</th>
                <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Ledger</th>
                <th className="text-right px-3 py-2.5 font-medium">Qty</th>
                <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Rate</th>
                <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Amount</th>
                <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">Tax</th>
                <th className="text-right px-3 py-2.5 font-medium">Total</th>
                <th className="px-3 py-2.5 w-6" />
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectProduct(item, invoice.id)}
                  className={`border-b border-gray-50 hover:bg-indigo-50/40 cursor-pointer transition group
                    ${idx === invoice.items.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="px-5 py-3 text-gray-800 font-medium group-hover:text-indigo-700 transition-colors">
                    {item.item_description}
                  </td>
                  <td className="px-3 py-3 text-gray-500 hidden md:table-cell">{item.ledger_account}</td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums">
                    {item.qty} <span className="text-gray-400 text-xs">{item.unit}</span>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums hidden sm:table-cell">₹{fmt(item.item_rate)}</td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums hidden sm:table-cell">₹{fmt(item.amount)}</td>
                  <td className="px-3 py-3 text-right text-gray-400 text-xs tabular-nums hidden lg:table-cell">₹{fmt(item.total_tax)}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800 tabular-nums">₹{fmt(item.total_amount)}</td>
                  {/* Chevron hint */}
                  <td className="px-3 py-3 text-gray-300 group-hover:text-indigo-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-100">
                <td colSpan={6} className="px-5 py-2 text-xs text-gray-400 text-right hidden lg:table-cell">Invoice Total</td>
                <td colSpan={2} className="px-5 py-2 text-xs text-gray-400 text-right lg:hidden">Invoice Total</td>
                <td className="px-3 py-2 text-right font-bold text-indigo-700 tabular-nums">₹{fmt(invoice.total_amount)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!collapsed && (!invoice.items || invoice.items.length === 0) && (
        <p className="px-5 py-4 text-sm text-gray-400 bg-white">No products on this invoice.</p>
      )}
    </div>
  );
}

/* ── Vendor group card ── */
export default function VendorGroup({
  vendorName,
  gstinUIN,
  invoices,
  onInvoiceDeleted,
  onProductUpdated,
  onProductDeleted,
}) {
  const [collapsed, setCollapsed]           = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // { product, invoiceId }
  const [confirmDelete, setConfirmDelete]   = useState(null); // { type, id, invoiceId? }
  const [actionLoading, setActionLoading]   = useState(false);
  const [error, setError]                   = useState("");

  const grandTotal  = invoices.reduce((s, inv) => s + Number(inv.total_amount), 0);
  const totalItems  = invoices.reduce((s, inv) => s + (inv.items?.length ?? 0), 0);

  /* ── delete invoice ── */
  const handleDeleteInvoice = async (invoiceId) => {
    setActionLoading(true);
    setError("");
    try {
      await api.deleteInvoice(invoiceId);
      onInvoiceDeleted(invoiceId);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setConfirmDelete(null);
    }
  };

  const confirmAction = () => {
    if (confirmDelete.type === "invoice") handleDeleteInvoice(confirmDelete.id);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── Vendor header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-sm font-bold uppercase">
                {vendorName?.charAt(0) ?? "?"}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-base leading-tight">{vendorName}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono tracking-wide">{gstinUIN || "No GSTIN"}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex gap-5 text-center divide-x divide-gray-100">
              <div className="pr-5">
                <p className="text-xs text-gray-400">Invoices</p>
                <p className="font-semibold text-gray-700 text-sm">{invoices.length}</p>
              </div>
              <div className="px-5">
                <p className="text-xs text-gray-400">Products</p>
                <p className="font-semibold text-gray-700 text-sm">{totalItems}</p>
              </div>
              <div className="pl-5">
                <p className="text-xs text-gray-400">Grand Total</p>
                <p className="font-bold text-indigo-700 text-sm">₹{fmt(grandTotal)}</p>
              </div>
            </div>

            <button
              onClick={() => setCollapsed((c) => !c)}
              className="text-gray-400 hover:text-gray-600 transition p-1"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 px-5 py-2 bg-red-50">{error}</p>
        )}

        {/* ── Invoice blocks ── */}
        {!collapsed && (
          <div className="flex flex-col gap-3 p-4 bg-gray-50/60">
            {invoices.map((invoice) => (
              <InvoiceBlock
                key={invoice.id}
                invoice={invoice}
                onDeleteInvoice={(id) => setConfirmDelete({ type: "invoice", id })}
                onSelectProduct={(product, invoiceId) => setSelectedProduct({ product, invoiceId })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Product detail modal (edit + delete inside) ── */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct.product}
          onClose={() => setSelectedProduct(null)}
          onUpdated={(updated) => {
            // Update the product inside local invoices state via parent callback
            onProductUpdated(selectedProduct.invoiceId, updated);
            // Keep modal open with fresh data
            setSelectedProduct({ ...selectedProduct, product: updated });
          }}
          onDeleted={(productId) => {
            onProductDeleted(selectedProduct.invoiceId, productId);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* ── Confirm delete invoice modal ── */}
      {confirmDelete && (
        <Modal
          title="Delete Invoice?"
          onClose={() => setConfirmDelete(null)}
        >
          <p className="text-sm text-gray-600 mb-6">
            This will permanently delete the invoice and all its products. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmAction}
              disabled={actionLoading}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition"
            >
              {actionLoading ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
