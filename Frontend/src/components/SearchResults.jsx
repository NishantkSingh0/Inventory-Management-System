import { useState } from "react";
import ProductDetailModal from "./ProductDetailModal";

function fmt(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

export default function SearchResults({ data, onProductUpdated, onProductDeleted }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (!data) return null;

  const invoices = data.results.filter((r) => r.type === "invoice");
  const products = data.results.filter((r) => r.type === "product");

  return (
    <>
      <div className="mt-4 flex flex-col gap-6">
        <p className="text-sm text-gray-500">
          {data.count} result{data.count !== 1 ? "s" : ""} for{" "}
          <span className="font-medium text-gray-700">"{data.query}"</span>
        </p>

        {/* ── Invoices ── */}
        {invoices.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Invoices
            </h3>
            <div className="flex flex-col gap-2">
              {invoices.map((r) => {
                const inv = r.payload;
                return (
                  <div
                    key={inv.id}
                    className="bg-white border border-gray-100 rounded-xl px-5 py-3 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{inv.vendor_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {inv.invoice_num} · {inv.invoice_date?.slice(0, 10)} · {inv.gstin_uin || "—"}
                      </p>
                    </div>
                    <p className="font-bold text-gray-800">₹{fmt(inv.total_amount)}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Products ── */}
        {products.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Products
            </h3>
            <div className="flex flex-col gap-2">
              {products.map((r) => {
                const p = r.payload;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="w-full text-left bg-white border border-gray-100 rounded-xl px-5 py-3
                      flex items-center justify-between shadow-sm
                      hover:border-indigo-200 hover:shadow-md hover:bg-indigo-50/30
                      active:scale-[0.99] transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">
                        {p.item_description}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.ledger_account && <span>{p.ledger_account}</span>}
                        {p.hsn_sac && <span> · HSN {p.hsn_sac}</span>}
                        <span> · Qty {p.qty} {p.unit}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-gray-800">₹{fmt(p.total_amount)}</p>
                        <p className="text-xs text-gray-400">Tax ₹{fmt(p.total_tax)}</p>
                      </div>
                      {/* Chevron hint */}
                      <svg
                        className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {data.count === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No results found.</p>
        )}
      </div>

      {/* ── Product detail modal ── */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdated={(updated) => {
            setSelectedProduct(updated);
            onProductUpdated?.(updated);
          }}
          onDeleted={(id) => {
            setSelectedProduct(null);
            onProductDeleted?.(id);
          }}
        />
      )}
    </>
  );
}
