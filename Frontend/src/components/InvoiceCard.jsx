import { useState } from "react";
import Modal from "./Modal";
import EditProductForm from "./EditProductForm";
import { api } from "../api";

function fmt(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

export default function InvoiceCard({ invoice, onDeleted, onProductUpdated, onProductDeleted }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDelete, setConfirmDelete]   = useState(null); // { type: "invoice"|"product", id }
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");

  /* ── delete invoice ── */
  const handleDeleteInvoice = async () => {
    setLoading(true);
    setError("");
    try {
      await api.deleteInvoice(invoice.id);
      onDeleted(invoice.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  /* ── delete product ── */
  const handleDeleteProduct = async (productId) => {
    setLoading(true);
    setError("");
    try {
      await api.deleteProduct(productId);
      onProductDeleted(invoice.id, productId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const confirmAction = () => {
    if (confirmDelete.type === "invoice") handleDeleteInvoice();
    else handleDeleteProduct(confirmDelete.id);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Invoice header */}
        <div className="flex items-start justify-between px-5 py-4 bg-linear-to-r from-indigo-50 to-white">
          <div>
            <p className="font-semibold text-gray-800 text-base">{invoice.vendor_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.invoice_num} &nbsp;·&nbsp; {invoice.invoice_date?.slice(0, 10)} &nbsp;·&nbsp; {invoice.gstin_uin || "—"}
            </p>
            {invoice.internal_ref && (
              <p className="text-xs text-gray-400">Ref: {invoice.internal_ref}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-bold text-gray-800">₹{fmt(invoice.total_amount)}</p>
            </div>
            <button
              onClick={() => setConfirmDelete({ type: "invoice", id: invoice.id })}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition font-medium"
            >
              Delete Invoice
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 px-5 py-2 bg-red-50">{error}</p>
        )}

        {/* Items table */}
        {invoice.items && invoice.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-5 py-2 font-medium">Description</th>
                  <th className="text-left px-3 py-2 font-medium">Ledger</th>
                  <th className="text-right px-3 py-2 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 font-medium">Rate</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-right px-3 py-2 font-medium">Tax</th>
                  <th className="text-right px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-5 py-2.5 text-gray-700 font-medium">{item.item_description}</td>
                    <td className="px-3 py-2.5 text-gray-500">{item.ledger_account}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{item.qty} {item.unit}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">₹{fmt(item.item_rate)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">₹{fmt(item.amount)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">₹{fmt(item.total_tax)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800">₹{fmt(item.total_amount)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setEditingProduct(item)}
                          className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: "product", id: item.id })}
                          className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit product modal */}
      {editingProduct && (
        <Modal title="Edit Product" onClose={() => setEditingProduct(null)}>
          <EditProductForm
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSuccess={(updated) => {
              setEditingProduct(null);
              onProductUpdated(invoice.id, updated);
            }}
          />
        </Modal>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <Modal
          title={confirmDelete.type === "invoice" ? "Delete Invoice?" : "Delete Product?"}
          onClose={() => setConfirmDelete(null)}
        >
          <p className="text-sm text-gray-600 mb-6">
            {confirmDelete.type === "invoice"
              ? "This will permanently delete the invoice and all its products. This cannot be undone."
              : "This will permanently remove this product from the invoice."}
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
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition"
            >
              {loading ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
