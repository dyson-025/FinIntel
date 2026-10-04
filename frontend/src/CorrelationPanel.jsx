import "./CorrelationPanel.css";

function formatCorrelation(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(4);
}

function relationshipClass(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "LOW / MIXED";
  if (n >= 0.7) return "HIGH POSITIVE";
  if (n >= 0.3) return "MODERATE POSITIVE";
  if (n > -0.3) return "LOW / MIXED";
  if (n > -0.7) return "MODERATE NEGATIVE";
  return "HIGH NEGATIVE";
}

export default function CorrelationPanel({ correlation }) {
  if (!correlation || correlation.error) {
    return null;
  }

  const symbols = Array.isArray(correlation.symbols)
    ? correlation.symbols
    : [];
  const pairwise = Array.isArray(correlation.pairwise)
    ? correlation.pairwise
    : [];
  const matrix =
    correlation.correlation_matrix &&
    typeof correlation.correlation_matrix === "object"
      ? correlation.correlation_matrix
      : {};

  return (
    <section className="data-section correlation-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CROSS-ASSET INTELLIGENCE</span>
          <h3>Relationship Analysis</h3>
        </div>
        <span className="data-source">
          {correlation.period || "1Y"} HISTORICAL
        </span>
      </div>

      {pairwise.length > 0 && (
        <div className="correlation-pairs">
          {pairwise.map((pair) => (
            <div
              className="correlation-pair-card"
              key={`${pair.asset_a}-${pair.asset_b}`}
            >
              <div className="correlation-pair-title">
                <strong>
                  {pair.asset_a} <span>↔</span> {pair.asset_b}
                </strong>
                <span className="correlation-badge">
                  {pair.relationship || relationshipClass(pair.correlation)}
                </span>
              </div>

              <div className="correlation-score">
                {formatCorrelation(pair.correlation)}
              </div>

              <div className="correlation-meta">
                <span>RETURN CORRELATION</span>
                <span>
                  {correlation.data_points || 0} observations
                </span>
              </div>

              <div className="correlation-bar">
                <span
                  style={{
                    width: `${Math.min(
                      Math.abs(Number(pair.correlation || 0)) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {symbols.length > 2 && (
        <div className="correlation-matrix-wrap">
          <div className="correlation-matrix-heading">
            <div>
              <span className="eyebrow">CORRELATION MATRIX</span>
              <span className="correlation-matrix-subtitle">
                Historical daily-return co-movement
              </span>
            </div>
          </div>

          <div className="correlation-matrix-scroll">
            <table className="correlation-matrix">
              <thead>
                <tr>
                  <th />
                  {symbols.map((symbol) => (
                    <th key={symbol}>{symbol}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map((symbol) => (
                  <tr key={symbol}>
                    <th>{symbol}</th>
                    {symbols.map((other) => (
                      <td key={`${symbol}-${other}`}>
                        {formatCorrelation(matrix?.[symbol]?.[other])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {correlation.source && (
        <div className="correlation-source">
          <span>SOURCE</span>
          <strong>{correlation.source.provider || "Unknown"}</strong>
          {correlation.source.retrieved_at && (
            <span>
              Retrieved{" "}
              {new Date(
                correlation.source.retrieved_at,
              ).toLocaleString()}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
