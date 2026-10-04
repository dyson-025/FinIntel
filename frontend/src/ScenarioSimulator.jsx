import { useEffect, useMemo, useState } from "react";
import "./ScenarioSimulator.css";

const DEFAULT_ROWS = [
  { symbol: "AMD", weight: 30, shock: -20 },
  { symbol: "NVDA", weight: 40, shock: -15 },
  { symbol: "AAPL", weight: 30, shock: -5 },
];

function rowsFromAssets(assets) {
  const symbols = Array.isArray(assets)
    ? assets.filter(Boolean).map((a) => String(a).toUpperCase())
    : [];
  if (!symbols.length) return DEFAULT_ROWS;
  const weight = Number((100 / symbols.length).toFixed(2));
  return symbols.map((symbol, index) => ({
    symbol,
    weight:
      index === symbols.length - 1
        ? Number((100 - weight * (symbols.length - 1)).toFixed(2))
        : weight,
    shock: -10,
  }));
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "—";
  return `${Number(value).toFixed(2)}%`;
}

export default function ScenarioSimulator({ initialAssets = [] }) {
  const [rows, setRows] = useState(() => rowsFromAssets(initialAssets));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialAssets?.length) setRows(rowsFromAssets(initialAssets));
  }, [initialAssets]);

  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.weight || 0), 0),
    [rows],
  );

  const updateRow = (index, field, value) =>
    setRows((current) =>
      current.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: field === "symbol" ? value.toUpperCase() : value,
            }
          : row,
      ),
    );
  const addRow = () => {
    if (rows.length < 5)
      setRows((current) => [...current, { symbol: "", weight: 0, shock: -10 }]);
  };
  const removeRow = (index) => {
    if (rows.length > 1)
      setRows((current) => current.filter((_, i) => i !== index));
  };

  const runScenario = async () => {
    const cleanedRows = rows
      .map((row) => ({
        symbol: String(row.symbol || "")
          .trim()
          .toUpperCase(),
        weight: Number(row.weight),
        shock: Number(row.shock),
      }))
      .filter((row) => row.symbol);
    if (!cleanedRows.length) {
      setError("Add at least one asset.");
      return;
    }
    if (
      cleanedRows.some(
        (row) => !Number.isFinite(row.weight) || !Number.isFinite(row.shock),
      )
    ) {
      setError("Weights and shocks must be valid numbers.");
      return;
    }
    const weightSum = cleanedRows.reduce((sum, row) => sum + row.weight, 0);
    if (Math.abs(weightSum - 100) > 0.01) {
      setError(
        `Portfolio weights must total 100%. Current total: ${weightSum.toFixed(2)}%.`,
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    const clauses = cleanedRows.map(
      (row) =>
        `${row.symbol} ${row.shock < 0 ? "falls" : "rises"} ${Math.abs(row.shock)}%`,
    );
    const weights = cleanedRows.map((row) => `${row.weight}% ${row.symbol}`);
    const question = `If ${clauses.join(", ")}, what is the impact on a portfolio weighted ${weights.join(", ")}?`;

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload?.message || `Backend returned ${response.status}`,
        );
      setResult(payload);
    } catch (err) {
      setError(err.message || "Scenario analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const stress =
    result?.data?.multi_asset_stress ||
    result?.data?.portfolio_scenario ||
    null;
  const hedge = result?.data?.hedge_recommendation || null;
  const correlation = result?.data?.correlation || null;
  const topCorrelation =
    Array.isArray(correlation?.pairwise) && correlation.pairwise.length
      ? [...correlation.pairwise].sort(
          (a, b) =>
            Math.abs(Number(b.correlation || 0)) -
            Math.abs(Number(a.correlation || 0)),
        )[0]
      : null;

  return (
    <section className="data-section scenario-simulator">
      <div className="section-heading">
        <div>
          <span className="eyebrow">QUANTITATIVE RISK</span>
          <h3>Scenario Simulator</h3>
        </div>
        <span className="data-source">DETERMINISTIC</span>
      </div>
      <div className="scenario-simulator-card">
        <div className="scenario-table">
          <div className="scenario-table-head">
            <span>ASSET</span>
            <span>WEIGHT %</span>
            <span>SHOCK %</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div className="scenario-table-row" key={`${row.symbol}-${index}`}>
              <input
                value={row.symbol}
                onChange={(e) => updateRow(index, "symbol", e.target.value)}
                placeholder="NVDA"
                aria-label={`Asset ${index + 1}`}
              />
              <input
                type="number"
                value={row.weight}
                onChange={(e) => updateRow(index, "weight", e.target.value)}
                aria-label={`${row.symbol || "Asset"} weight`}
              />
              <input
                type="number"
                value={row.shock}
                onChange={(e) => updateRow(index, "shock", e.target.value)}
                aria-label={`${row.symbol || "Asset"} shock`}
              />
              <button
                type="button"
                className="scenario-remove"
                onClick={() => removeRow(index)}
                disabled={rows.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="scenario-controls">
          <span
            className={
              Math.abs(totalWeight - 100) < 0.01
                ? "scenario-weight-ok"
                : "scenario-weight-warning"
            }
          >
            Portfolio weight: {totalWeight.toFixed(2)}%
          </span>
          <div className="scenario-actions">
            <button
              type="button"
              className="scenario-add"
              onClick={addRow}
              disabled={rows.length >= 5}
            >
              + ADD ASSET
            </button>
            <button
              type="button"
              className="scenario-run"
              onClick={runScenario}
              disabled={loading}
            >
              {loading ? "RUNNING..." : "RUN SCENARIO →"}
            </button>
          </div>
        </div>
        {error && <div className="scenario-error">{error}</div>}
        {stress && !stress.error && (
          <div className="scenario-results">
            <div className="scenario-result-grid">
              <div className="scenario-result-stat">
                <span>PORTFOLIO IMPACT</span>
                <strong
                  className={
                    Number(stress.total_portfolio_impact) >= 0
                      ? "positive"
                      : "negative"
                  }
                >
                  {formatPercent(stress.total_portfolio_impact)}
                </strong>
              </div>
              <div className="scenario-result-stat">
                <span>RISK LEVEL</span>
                <strong>{stress.risk_level || "—"}</strong>
              </div>
              <div className="scenario-result-stat">
                <span>POSITIONS</span>
                <strong>{stress.breakdown?.length || rows.length}</strong>
              </div>
            </div>
            {Array.isArray(stress.breakdown) && stress.breakdown.length > 0 && (
              <div className="scenario-breakdown">
                {stress.breakdown.map((item, index) => {
                  const inputRow = rows.find(
                    (row) =>
                      String(row.symbol).toUpperCase() ===
                      String(item.symbol || "").toUpperCase(),
                  );
                  const weight = inputRow
                    ? Number(inputRow.weight)
                    : Number(
                        item.weight_pct ??
                          item.weight_percent ??
                          item.weight ??
                          0,
                      ) * 100;
                  const shock = inputRow
                    ? Number(inputRow.shock)
                    : Number(
                        item.scenario_change ??
                          item.change_percent ??
                          item.shock ??
                          0,
                      );
                  const impact = Number(
                    item.portfolio_impact ??
                      item.impact ??
                      item.weighted_impact ??
                      0,
                  );
                  return (
                    <div
                      className="scenario-breakdown-row"
                      key={`${item.symbol}-${index}`}
                    >
                      <span>{item.symbol || "—"}</span>
                      <span>{formatPercent(weight)}</span>
                      <span>{formatPercent(shock)}</span>
                      <strong className={impact >= 0 ? "positive" : "negative"}>
                        {formatPercent(impact)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
            {topCorrelation && (
              <div className="scenario-correlation">
                <span className="eyebrow">CROSS-ASSET CONTEXT</span>
                <strong>
                  {topCorrelation.asset_a} ↔ {topCorrelation.asset_b}
                </strong>
                <p>
                  Correlation:{" "}
                  <b>{Number(topCorrelation.correlation).toFixed(4)}</b> ·{" "}
                  {topCorrelation.relationship || "HISTORICAL RELATIONSHIP"}
                </p>
              </div>
            )}
            {hedge && !hedge.error && (
              <div className="scenario-hedge">
                <span className="eyebrow">RISK RESPONSE</span>
                <strong>{hedge.hedge_type || "CONCENTRATION_REDUCTION"}</strong>
                <p>
                  Target:{" "}
                  <b>
                    {hedge.target_symbol ||
                      hedge.target_asset ||
                      hedge.symbol ||
                      "—"}
                  </b>
                  {hedge.proposed_trim_pct !== undefined
                    ? ` · Proposed trim: ${hedge.proposed_trim_pct}%`
                    : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
