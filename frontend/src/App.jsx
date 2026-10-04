import { useState } from "react";

import "./App.css";

import HistoricalChart from "./HistoricalChart";

import EvidencePanel from "./EvidencePanel";

import RiskRecommendation from "./RiskRecommendation";

import MacroPanel from "./MacroPanel";

import NewsPanel from "./NewsPanel";

import ScenarioSimulator from "./ScenarioSimulator";

import CorrelationPanel from "./CorrelationPanel";

const EXAMPLES = [
  "Why did NVIDIA fall today?",

  "What happens if AMD falls 20%?",

  "How do higher interest rates affect technology stocks?",

  "Compare NVIDIA and AMD",
];

function formatNumber(value) {
  if (value === null || value === undefined) return "—";

  if (typeof value === "number") {
    if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)}T`;

    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;

    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;

    return value.toLocaleString();
  }

  return value;
}

function formatPercent(value) {
  if (value === null || value === undefined) return "—";

  return `${Number(value).toFixed(2)}%`;
}

function TraceItem({ name, description, active = false, last = false }) {
  return (
    <div
      className={`trace-item ${active ? "active" : ""} ${last ? "last" : ""}`}
    >
      <div className="trace-marker">
        <span>✓</span>
      </div>

      <div className="trace-content">
        <div className="trace-name">{name}</div>

        <div className="trace-description">{description}</div>
      </div>
    </div>
  );
}

function MarketCard({ item }) {
  const positive =
    item?.change_percent !== undefined &&
    item?.change_percent !== null &&
    Number(item.change_percent) >= 0;

  return (
    <div className="market-card">
      <div className="market-card-top">
        <div>
          <span className="eyebrow">MARKET</span>

          <div className="ticker">{item.symbol}</div>
        </div>

        <div
          className={`market-direction ${positive ? "positive" : "negative"}`}
        >
          {positive ? "↑" : "↓"}
        </div>
      </div>

      <div className="market-price">
        {item.price !== undefined ? `$${Number(item.price).toFixed(2)}` : "—"}
      </div>

      <div className={`market-change ${positive ? "positive" : "negative"}`}>
        {item.change !== undefined && item.change !== null
          ? `${positive ? "+" : ""}${Number(item.change).toFixed(2)}`
          : "—"}

        {"  "}

        {formatPercent(item.change_percent)}
      </div>

      <div className="market-meta">
        <span>VOLUME</span>

        <strong>{formatNumber(item.volume)}</strong>
      </div>
    </div>
  );
}

function AnalysisText({ text }) {
  if (!text) {
    return <div className="empty-analysis">No analysis was returned.</div>;
  }

  const lines = String(text).split("\n");

  const renderInlineMarkdown = (value) => {
    const parts = String(value).split(/(\*\*.*?\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={index}>{part.replace(/\*\*/g, "")}</strong>;
      }

      return part;
    });
  };

  return (
    <div className="analysis-text">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={index} className="analysis-spacer" />;
        }

        // Markdown divider
        if (/^-{3,}$/.test(trimmed)) {
          return (
            <div
              key={index}
              style={{
                height: "1px",
                margin: "22px 0",
                background: "rgba(255,255,255,0.07)",
              }}
            />
          );
        }

        // Display-math delimiters: hide them and keep the
        // actual equation line readable below.
        if (trimmed === "\\[" || trimmed === "\\]") {
          return null;
        }

        // Markdown headings such as ### SUMMARY
        if (trimmed.startsWith("#")) {
          return (
            <div key={index} className="analysis-heading">
              {trimmed.replace(/^#+\s*/, "")}
            </div>
          );
        }

        // Bold-only headings such as **SUMMARY**
        if (
          trimmed.startsWith("**") &&
          trimmed.endsWith("**") &&
          trimmed.length > 4
        ) {
          return (
            <div key={index} className="analysis-heading">
              {trimmed.replace(/\*\*/g, "")}
            </div>
          );
        }

        // Bullet points using "-" or "•"
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const bulletText = trimmed.replace(/^[-•]\s*/, "");

          return (
            <div key={index} className="analysis-bullet">
              <span>•</span>

              <p>{renderInlineMarkdown(bulletText)}</p>
            </div>
          );
        }

        // Inline LaTeX-ish equations are rendered as readable
        // text instead of exposing raw display delimiters.
        if (
          trimmed.startsWith("\\text{") ||
          trimmed.includes("\\times") ||
          trimmed.includes("\\=")
        ) {
          const formula = trimmed
            .replace(/\\text\{(.*?)\}/g, "$1")
            .replace(/\\times/g, "×")
            .replace(/\\cdot/g, "·")
            .replace(/\\,/g, " ")
            .replace(/\\=/g, "=");

          return (
            <p
              key={index}
              style={{
                paddingLeft: "21px",
                color: "#aaa19c",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: "13px",
              }}
            >
              {formula}
            </p>
          );
        }

        return <p key={index}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

function App() {
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("terminal");

  const analyzeQuery = async (customQuery) => {
    const finalQuery = (customQuery ?? query).trim();

    if (!finalQuery || loading) return;

    setQuery(finalQuery);

    setLoading(true);

    setError("");

    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          query: finalQuery,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            responseData?.error ||
            `Backend returned ${response.status}`,
        );
      }

      setResult(responseData);
    } catch (err) {
      console.error("FinIntel analysis error:", err);

      setError(
        err?.message || "Something went wrong while analyzing your question.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    analyzeQuery();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      analyzeQuery();
    }
  };

  const plan = result?.plan || {};

  const data = result?.data || {};

  const analysis = result?.analysis || result?.answer || result?.response || "";

  const marketData = Array.isArray(data?.market)
    ? data.market
    : data?.market
      ? [data.market]
      : [];

  const portfolioImpact =
    data?.risk?.total_portfolio_impact ?? data?.portfolio_impact ?? null;

  const scenario = data?.risk || data?.scenario || null;

  return (
    <div className="app-shell">
      {/* Ambient background */}

      <div className="ambient ambient-one" />

      <div className="ambient ambient-two" />

      <div className="workspace-tabs">
        <button
          className={activeTab === "terminal" ? "active" : ""}
          onClick={() => setActiveTab("terminal")}
        >
          AI TERMINAL
        </button>

        <button
          className={activeTab === "scenario" ? "active" : ""}
          onClick={() => setActiveTab("scenario")}
        >
          SCENARIO LAB
        </button>
      </div>

      {activeTab === "terminal" ? (
        <main>
          {/* HERO */}

          <section className="hero">
            <div className="hero-kicker">
              <span className="kicker-line" />
              AI-POWERED MARKET INTELLIGENCE
            </div>

            <h1>
              Ask the market.
              <span>Understand the risk.</span>
            </h1>

            <p className="hero-description">
              Ask FinIntel about companies, markets, macroeconomics, historical
              events, portfolio exposure, or financial scenarios.
            </p>

            {/* SEARCH */}

            <form className="query-wrapper" onSubmit={handleSubmit}>
              <div className="query-icon">⌕</div>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a financial question..."
                spellCheck="false"
                autoComplete="off"
              />

              <button type="submit" disabled={loading || !query.trim()}>
                {loading ? (
                  <>
                    <span className="button-spinner" />
                    ANALYZING
                  </>
                ) : (
                  <>
                    ANALYZE
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            {/* EXAMPLES */}

            <div className="examples">
              <span className="examples-label">TRY</span>

              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  className="example-chip"
                  onClick={() => analyzeQuery(example)}
                >
                  {example}
                </button>
              ))}
            </div>

            {/* CAPABILITY STRIP */}

            {!result && !loading && (
              <div className="capability-grid">
                <div className="capability">
                  <span className="capability-number">01</span>

                  <div>
                    <strong>MARKET DATA</strong>

                    <p>Prices, movement & company metrics</p>
                  </div>
                </div>

                <div className="capability">
                  <span className="capability-number">02</span>

                  <div>
                    <strong>HISTORICAL RAG</strong>

                    <p>Evidence from previous market events</p>
                  </div>
                </div>

                <div className="capability">
                  <span className="capability-number">03</span>

                  <div>
                    <strong>RISK ANALYSIS</strong>

                    <p>Deterministic scenario calculations</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* LOADING */}

          {loading && (
            <section className="loading-section">
              <div className="loading-panel">
                <div className="loading-orbit">
                  <div />
                </div>

                <div>
                  <div className="eyebrow">FININTEL ENGINE</div>

                  <h2>Analyzing your question</h2>

                  <p>
                    Decomposing the query and retrieving relevant financial
                    intelligence...
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ERROR */}

          {error && (
            <section className="result-section">
              <div className="error-panel">
                <div className="error-icon">!</div>

                <div>
                  <span className="eyebrow">CONNECTION ERROR</span>

                  <h3>Analysis unavailable</h3>

                  <p>{error}</p>
                </div>
              </div>
            </section>
          )}

          {/* RESULTS */}

          {result && !loading && (
            <section className="result-section">
              {/* Result heading */}

              <div className="result-header">
                <div>
                  <div className="eyebrow">ANALYSIS COMPLETE</div>

                  <h2>{query}</h2>
                </div>

                <div className="complete-badge">
                  <span>✓</span>
                  COMPLETE
                </div>
              </div>

              {/* Main result grid */}

              <div className="result-grid">
                {/* LEFT */}

                <div className="main-column">
                  {/* Analysis */}

                  <article className="panel analysis-panel">
                    <div className="panel-header">
                      <div>
                        <span className="eyebrow">AI REASONING</span>

                        <h3>Financial Analysis</h3>
                      </div>

                      <div className="ai-badge">AI</div>
                    </div>

                    <div className="panel-body">
                      <AnalysisText text={analysis} />
                    </div>
                  </article>

                  {/* Market cards */}

                  {marketData.length > 0 && (
                    <section className="data-section">
                      <div className="section-heading">
                        <div>
                          <span className="eyebrow">LIVE SNAPSHOT</span>

                          <h3>Market Data</h3>
                        </div>

                        <span className="data-source">YFINANCE</span>
                      </div>

                      <div className="market-grid">
                        {marketData.map((item, index) => (
                          <MarketCard
                            key={`${item.symbol}-${index}`}
                            item={item}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* NEWS */}

                  <NewsPanel
                    data={data}
                    enabled={plan?.tools?.includes("NEWS")}
                  />

                  {/* MACRO */}

                  <MacroPanel macro={data?.macro} />

                  {/* Scenario */}

                  {scenario && (
                    <section className="data-section">
                      <div className="section-heading">
                        <div>
                          <span className="eyebrow">DETERMINISTIC MODEL</span>

                          <h3>Scenario Impact</h3>
                        </div>
                      </div>

                      <div className="scenario-panel">
                        {scenario.current_price !== undefined && (
                          <div className="scenario-stat">
                            <span>CURRENT PRICE</span>

                            <strong>
                              ${Number(scenario.current_price).toFixed(2)}
                            </strong>
                          </div>
                        )}

                        {scenario.scenario_change_percent !== undefined && (
                          <div className="scenario-stat">
                            <span>SCENARIO</span>

                            <strong
                              className={
                                Number(scenario.scenario_change_percent) >= 0
                                  ? "positive"
                                  : "negative"
                              }
                            >
                              {Number(scenario.scenario_change_percent) > 0
                                ? "+"
                                : ""}
                              {scenario.scenario_change_percent}%
                            </strong>
                          </div>
                        )}

                        {scenario.projected_price !== undefined && (
                          <div className="scenario-stat highlight">
                            <span>PROJECTED PRICE</span>

                            <strong>
                              ${Number(scenario.projected_price).toFixed(2)}
                            </strong>
                          </div>
                        )}

                        {portfolioImpact !== null && (
                          <div className="scenario-stat highlight">
                            <span>PORTFOLIO IMPACT</span>

                            <strong
                              className={
                                Number(portfolioImpact) >= 0
                                  ? "positive"
                                  : "negative"
                              }
                            >
                              {Number(portfolioImpact) > 0 ? "+" : ""}
                              {portfolioImpact}%
                            </strong>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Portfolio breakdown */}

                  {scenario?.breakdown && Array.isArray(scenario.breakdown) && (
                    <section className="data-section">
                      <div className="section-heading">
                        <div>
                          <span className="eyebrow">EXPOSURE ANALYSIS</span>

                          <h3>Portfolio Breakdown</h3>
                        </div>
                      </div>

                      <div className="breakdown-list">
                        {scenario.breakdown.map((item, index) => (
                          <div
                            className="breakdown-row"
                            key={`${item.symbol}-${index}`}
                          >
                            <div className="breakdown-symbol">
                              {item.symbol}
                            </div>

                            <div className="breakdown-bar">
                              <span
                                style={{
                                  width: `${Math.min(
                                    Math.abs(Number(item.weight || 0)) * 100,

                                    100,
                                  )}%`,
                                }}
                              />
                            </div>

                            <div className="breakdown-weight">
                              {Number(item.weight || 0) * 100}%
                            </div>

                            <div
                              className={`breakdown-impact ${
                                Number(item.portfolio_impact) >= 0
                                  ? "positive"
                                  : "negative"
                              }`}
                            >
                              {Number(item.portfolio_impact) > 0 ? "+" : ""}
                              {item.portfolio_impact}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <CorrelationPanel correlation={data?.correlation} />

                  {/* RISK & RECOMMENDATION */}

                  <RiskRecommendation data={data} />

                  {/* HISTORICAL PRICE CHART */}

                  {result?.data?.historical_market &&
                    Object.entries(result.data.historical_market).map(
                      ([symbol, stockData]) => {
                        if (!stockData?.history) return null;

                        return (
                          <HistoricalChart
                            key={symbol}
                            symbol={symbol}
                            history={stockData.history}
                          />
                        );
                      },
                    )}
                </div>

                {/* RIGHT SIDEBAR */}

                <aside className="side-column">
                  <div className="panel trace-panel">
                    <div className="panel-header">
                      <div>
                        <span className="eyebrow">SYSTEM</span>

                        <h3>Execution Trace</h3>
                      </div>

                      <span className="online-indicator" />
                    </div>

                    <div className="trace-list">
                      {result?.execution_trace?.map((step, index) => (
                        <TraceItem
                          key={`${step.name}-${index}`}
                          name={step.name}
                          description={step.description}
                          active={step.status === "completed"}
                          last={index === result.execution_trace.length - 1}
                        />
                      ))}
                    </div>
                  </div>

                  <EvidencePanel data={data} />

                  {/* Query plan */}

                  <div className="panel plan-panel">
                    <div className="panel-header compact">
                      <div>
                        <span className="eyebrow">INTELLIGENCE PLAN</span>

                        <h3>Query Profile</h3>
                      </div>
                    </div>

                    <div className="plan-content">
                      <div className="plan-row">
                        <span>TYPE</span>

                        <strong>{plan.question_type || "GENERAL"}</strong>
                      </div>

                      <div className="plan-row">
                        <span>ASSETS</span>

                        <strong>
                          {plan.assets?.length
                            ? plan.assets.join(", ")
                            : "NONE"}
                        </strong>
                      </div>

                      <div className="plan-row">
                        <span>TOOLS</span>

                        <strong>
                          {plan.tools?.length ? plan.tools.join(" · ") : "NONE"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Audit */}

                  <div className="audit-card">
                    <div className="audit-icon">◈</div>

                    <div>
                      <span className="eyebrow">AUDITABILITY</span>

                      <p>
                        Analysis generated from retrieved data, deterministic
                        calculations and model reasoning.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          )}
        </main>
      ) : (
        <main className="scenario-workspace">
          <section className="scenario-lab-page">
            <span className="eyebrow">QUANTITATIVE RISK</span>

            <h1>Scenario Lab</h1>

            <p>Portfolio stress testing workspace.</p>

            <ScenarioSimulator />
          </section>
        </main>
      )}

      <footer className="footer">
        <span>FININTEL</span>

        <span>AI FINANCIAL INTELLIGENCE</span>

        <span>v1.0</span>
      </footer>
    </div>
  );
}

export default App;
