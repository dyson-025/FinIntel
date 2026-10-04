export default function MacroPanel({ macro }) {
  if (!macro) {
    return null;
  }

  const values = macro?.values || {};
  const entries = Object.entries(values);

  if (entries.length === 0) {
    return null;
  }

  const formatValue = (value) => {
    // Primitive number
    if (typeof value === "number") {
      return value.toFixed(2);
    }

    // Primitive string
    if (typeof value === "string") {
      return value;
    }

    // Macro indicators are commonly returned as objects
    if (value && typeof value === "object") {
      if (value.value !== undefined && value.value !== null) {
        if (typeof value.value === "number") {
          return value.value.toFixed(2);
        }

        return String(value.value);
      }

      if (value.current !== undefined && value.current !== null) {
        if (typeof value.current === "number") {
          return value.current.toFixed(2);
        }

        return String(value.current);
      }

      if (value.rate !== undefined && value.rate !== null) {
        if (typeof value.rate === "number") {
          return value.rate.toFixed(2);
        }

        return String(value.rate);
      }

      return "—";
    }

    return "—";
  };

  const formatLabel = (key) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <section className="data-section macro-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MACROECONOMIC INTELLIGENCE</span>

          <h3>Economic Indicators</h3>
        </div>

        <span className="data-source">
          {macro?.source?.status || "UNKNOWN"}
        </span>
      </div>

      <div className="macro-grid">
        {entries.map(([key, value]) => (
          <div className="macro-card" key={key}>
            <span className="macro-label">{formatLabel(key)}</span>

            <strong className="macro-value">{formatValue(value)}</strong>
          </div>
        ))}
      </div>

      {macro?.source && (
        <div className="macro-source">
          <span>SOURCE</span>

          <strong>{macro.source.provider || "Unknown"}</strong>

          {macro.source.retrieved_at && (
            <span>
              Retrieved {new Date(macro.source.retrieved_at).toLocaleString()}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
