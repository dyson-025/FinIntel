import "./EvidencePanel.css";

function collectSources(value, found = []) {
  if (!value || typeof value !== "object") {
    return found;
  }

  if (
    value.source &&
    typeof value.source === "object" &&
    value.source.provider
  ) {
    found.push(value.source);
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSources(item, found));
    return found;
  }

  Object.values(value).forEach((item) => collectSources(item, found));
  return found;
}

function dedupeSources(sources) {
  const seen = new Set();

  return sources.filter((source) => {
    const key = [
      source.provider || "",
      source.status || "",
      source.url || "",
      source.retrieved_at || "",
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatRetrievedAt(value) {
  if (!value) return "Retrieval time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

export default function EvidencePanel({ data }) {
  const sources = dedupeSources(collectSources(data));

  if (sources.length === 0) {
    return null;
  }

  return (
    <section className="evidence-panel">
      <div className="evidence-header">
        <div>
          <span className="evidence-eyebrow">EVIDENCE &amp; AUDIT</span>
          <h3>Data Sources</h3>
        </div>

        <span className="evidence-count">
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </span>
      </div>

      <div className="evidence-list">
        {sources.map((source, index) => (
          <article
            className="evidence-source"
            key={`${source.provider}-${source.status}-${index}`}
          >
            <div className="evidence-source-top">
              <div className="evidence-source-icon">◈</div>

              <div className="evidence-source-main">
                <strong>{source.provider || "Unknown source"}</strong>
                <span
                  className={`evidence-status ${String(
                    source.status || "",
                  ).toLowerCase()}`}
                >
                  {source.status || "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="evidence-source-meta">
              {formatRetrievedAt(source.retrieved_at)}
            </div>

            {source.url && (
              <a
                className="evidence-link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                View source
                <span>↗</span>
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
