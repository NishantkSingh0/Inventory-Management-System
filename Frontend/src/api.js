const BASE = "http://localhost:8080/api";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  // Invoices
  listInvoices:  ()           => request("GET",    "/invoices"),
  createInvoice: (payload)    => request("POST",   "/invoices", payload),
  getInvoice:    (id)         => request("GET",    `/invoices/${id}`),
  deleteInvoice: (id)         => request("DELETE", `/invoices/${id}`),

  // Products
  updateProduct: (id, payload) => request("PUT",    `/products/${id}`, payload),
  deleteProduct: (id)          => request("DELETE", `/products/${id}`),

  // Search
  search: (q) => request("GET", `/search?q=${encodeURIComponent(q)}`),
};
