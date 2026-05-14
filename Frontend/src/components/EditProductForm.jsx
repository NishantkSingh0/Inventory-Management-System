import { useState } from "react";
import Field from "./Field";
import { api } from "../api";

export default function EditProductForm({ product, onSuccess, onClose }) {
  const [form, setForm] = useState({
    item_description: product.item_description ?? "",
    qty:              String(product.qty          ?? ""),
    item_rate:        String(product.item_rate    ?? ""),
    amount:           String(product.amount       ?? ""),
    cgst:             String(product.cgst         ?? ""),
    sgst:             String(product.sgst         ?? ""),
    igst:             String(product.igst         ?? ""),
    total_tax:        String(product.total_tax    ?? ""),
    total_amount:     String(product.total_amount ?? ""),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        item_description: form.item_description,
        qty:          parseFloat(form.qty)          || 0,
        item_rate:    parseFloat(form.item_rate)    || 0,
        amount:       parseFloat(form.amount)       || 0,
        cgst:         parseFloat(form.cgst)         || 0,
        sgst:         parseFloat(form.sgst)         || 0,
        igst:         parseFloat(form.igst)         || 0,
        total_tax:    parseFloat(form.total_tax)    || 0,
        total_amount: parseFloat(form.total_amount) || 0,
      };
      const updated = await api.updateProduct(product.id, payload);
      onSuccess(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Item Description" name="item_description"
            value={form.item_description} onChange={handle} required />
        </div>
        <Field label="Qty"            name="qty"          type="number" step="0.01" value={form.qty}          onChange={handle} required />
        <Field label="Item Rate (₹)"  name="item_rate"    type="number" step="0.01" value={form.item_rate}    onChange={handle} required />
        <Field label="Amount (₹)"     name="amount"       type="number" step="0.01" value={form.amount}       onChange={handle} required />
        <Field label="CGST (%)"       name="cgst"         type="number" step="0.01" value={form.cgst}         onChange={handle} />
        <Field label="SGST (%)"       name="sgst"         type="number" step="0.01" value={form.sgst}         onChange={handle} />
        <Field label="IGST (%)"       name="igst"         type="number" step="0.01" value={form.igst}         onChange={handle} />
        <Field label="Total Tax (₹)"  name="total_tax"    type="number" step="0.01" value={form.total_tax}    onChange={handle} />
        <Field label="Total Amount (₹)" name="total_amount" type="number" step="0.01" value={form.total_amount} onChange={handle} required />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition">
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
