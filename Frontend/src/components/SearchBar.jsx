import { useState, useRef } from "react";
import { api } from "../api";

export default function SearchBar({ onResults, onClear }) {
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const debounceRef           = useRef(null);

  const runSearch = async (q) => {
    if (!q.trim()) { onClear(); return; }
    setLoading(true);
    setError("");
    try {
      const data = await api.search(q.trim());
      onResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 400);
  };

  const handleClear = () => {
    setQuery("");
    setError("");
    onClear();
  };

  return (
    <div className="relative w-full max-w-lg">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-400 transition">
        {/* Search icon */}
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search invoices, products, vendors…"
          className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          aria-label="Search"
        />

        {loading && (
          <svg className="w-4 h-4 text-indigo-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}

        {query && !loading && (
          <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">
            &times;
          </button>
        )}
      </div>

      {error && (
        <p className="absolute top-full mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
