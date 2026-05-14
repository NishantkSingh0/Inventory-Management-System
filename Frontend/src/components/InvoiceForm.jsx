import { useState } from "react";
import Field from "./Field";
import { api } from "../api";

const EMPTY_ITEM = {
  item_description: "",
  ledger_account: "",
  qty: "",
  unit: "",
  item_rate: "",
  amount: "",
  hsn_sac: "",
  cgst: "",
  sgst: "",
  igst: "",
  total_tax: "",
  total_amount: "",
};

const EMPTY_INVOICE = {
  invoice_date: "",
  vendor_name: "",
  gstin_uin: "",
  invoice_num: "",
  internal_ref: "",
  invoice_img_url: "",
};

export default function InvoiceForm({ onSuccess, onClose }) {
  const [step, setStep] = useState(1); // 1 = invoice info, 2 = items
  const [invoice, setInvoice] = useState(EMPTY_INVOICE);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── field helpers ── */
  const handleInvoice = (e) =>
    setInvoice((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleItem = (idx, e) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [e.target.name]: e.target.value } : item
    );
    setItems(updated);
  };

  const addItem = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);

  const removeItem = (idx) =>
    setItems((p) => p.filter((_, i) => i !== idx));

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...invoice,
        items: items.map((item) => ({
          ...item,
          qty:          parseFloat(item.qty)          || 0,
          item_rate:    parseFloat(item.item_rate)    || 0,
          amount:       parseFloat(item.amount)       || 0,
          cgst:         parseFloat(item.cgst)         || 0,
          sgst:         parseFloat(item.sgst)         || 0,
          igst:         parseFloat(item.igst)         || 0,
          total_tax:    parseFloat(item.total_tax)    || 0,
          total_amount: parseFloat(item.total_amount) || 0,
        })),
      };
      const result = await api.createInvoice(payload);
      onSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── step 1: invoice info ── */
  if (step === 1) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); setStep(2); }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice Date"   name="invoice_date"   type="date"  value={invoice.invoice_date}   onChange={handleInvoice} required />
          <Field label="Invoice Number" name="invoice_num"    value={invoice.invoice_num}    onChange={handleInvoice} required placeholder="INV-001" />
          <Field label="Vendor Name"    name="vendor_name"    value={invoice.vendor_name}    onChange={handleInvoice} required placeholder="ABC Traders" />
          <Field label="GSTIN / UIN"    name="gstin_uin"      value={invoice.gstin_uin}      onChange={handleInvoice} placeholder="07ABCDE1234F1Z5" />
          <Field label="Internal Ref"   name="internal_ref"   value={invoice.internal_ref}   onChange={handleInvoice} placeholder="INT-5001" />
          <Field label="Invoice Image URL" name="invoice_img_url" value={invoice.invoice_img_url} onChange={handleInvoice} placeholder="bucket/invoices/inv001.png" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button type="submit"
            className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
            Next: Add Products →
          </button>
        </div>
      </form>
    );
  }

  /* ── step 2: items ── */
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Invoice summary pill */}
      <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-4 py-2 text-sm text-indigo-700">
        <span className="font-medium">{invoice.vendor_name}</span>
        <span className="text-indigo-300">·</span>
        <span>{invoice.invoice_num}</span>
        <span className="text-indigo-300">·</span>
        <span>{invoice.invoice_date}</span>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="ml-auto text-xs underline text-indigo-500 hover:text-indigo-700"
        >
          Edit
        </button>
      </div>

      {/* Items */}
      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Product {idx + 1}
          </p>
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-lg leading-none"
              aria-label="Remove item"
            >
              &times;
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Item Description" name="item_description" value={item.item_description}
                onChange={(e) => handleItem(idx, e)} required placeholder="HP Laptop" />
            </div>
            <Field label="Ledger Account" name="ledger_account" value={item.ledger_account}
              onChange={(e) => handleItem(idx, e)} placeholder="Electronics" />
            <Field label="HSN / SAC" name="hsn_sac" value={item.hsn_sac}
              onChange={(e) => handleItem(idx, e)} placeholder="8471" />
            <Field label="Qty" name="qty" type="number" step="0.01" min="0"
              value={item.qty} onChange={(e) => handleItem(idx, e)} required />
            <Field label="Unit" name="unit" value={item.unit}
              onChange={(e) => handleItem(idx, e)} placeholder="pcs" />
            <Field label="Item Rate (₹)" name="item_rate" type="number" step="0.01" min="0"
              value={item.item_rate} onChange={(e) => handleItem(idx, e)} required />
            <Field label="Amount (₹)" name="amount" type="number" step="0.01" min="0"
              value={item.amount} onChange={(e) => handleItem(idx, e)} required />
            <Field label="CGST (%)" name="cgst" type="number" step="0.01" min="0"
              value={item.cgst} onChange={(e) => handleItem(idx, e)} />
            <Field label="SGST (%)" name="sgst" type="number" step="0.01" min="0"
              value={item.sgst} onChange={(e) => handleItem(idx, e)} />
            <Field label="IGST (%)" name="igst" type="number" step="0.01" min="0"
              value={item.igst} onChange={(e) => handleItem(idx, e)} />
            <Field label="Total Tax (₹)" name="total_tax" type="number" step="0.01" min="0"
              value={item.total_tax} onChange={(e) => handleItem(idx, e)} />
            <Field label="Total Amount (₹)" name="total_amount" type="number" step="0.01" min="0"
              value={item.total_amount} onChange={(e) => handleItem(idx, e)} required />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
      >
        <span className="text-xl leading-none">+</span> Add Another Product
      </button>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => setStep(1)}
          className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition">
          ← Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? "Saving…" : "Submit Invoice"}
        </button>
      </div>
    </form>
  );
}
