/** Reusable labelled input / select */
export default function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder = "",
  options,        // if provided, renders a <select>
  step,
  min,
}) {
  const base =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition";

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={base}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          step={step}
          min={min}
          className={base}
        />
      )}
    </div>
  );
}
