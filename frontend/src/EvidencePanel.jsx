export default function EvidencePanel({ data }) {
  if (!data) {
    return null;
  }

  const sources = [];

  const collectSources = (value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(collectSources);
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    if (value.source && typeof value.source === "object") {
      sources.push(value.source);
    }

    Object.values(value).forEach(collectSources);
  };

  collectSources(data);

  // Remove duplicate sources
  const uniqueSources = sources.filter((source, index, array) => {
    return (
      index ===
      array.findIndex(
        (item) =>
          item.provider === source.provider &&
          item.status === source.status &&
          item.url === source.url,
      )
    );
  });

  if (uniqueSources.length === 0) {
    return (
      <div className="panel evidence-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">EVIDENCE</span>
            <h3>Sources</h3>
          </div>
        </div>

        <div className="evidence-empty">
          No source metadata available for this analysis.
        </div>
      </div>
    );
  }

  return (
    <div className="panel evidence-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">EVIDENCE & AUDIT</span>
          <h3>Data Sources</h3>
        </div>

        <span className="evidence-count">{uniqueSources.length} sources</span>
      </div>

      <div className="evidence-list">
        {uniqueSources.map((source, index) => (
          <div className="evidence-item" key={index}>
            <div className="evidence-top">
              <div className="evidence-provider">
                {source.provider || "Unknown source"}
              </div>

              <span
                className={`evidence-status ${String(
                  source.status || "UNKNOWN",
                ).toLowerCase()}`}
              >
                {source.status || "UNKNOWN"}
              </span>
            </div>

            {source.retrieved_at && (
              <div className="evidence-time">
                Retrieved: {new Date(source.retrieved_at).toLocaleString()}
              </div>
            )}

            {source.url && (
              <a
                className="evidence-link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                View source →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
