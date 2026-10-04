export default function RiskRecommendation({ data }) {
  const stress = data?.multi_asset_stress;
  const hedge = data?.hedge_recommendation;

  if (!stress && !hedge) {
    return null;
  }

  const portfolioImpact =
    stress?.total_portfolio_impact ??
    stress?.portfolio_impact ??
    stress?.total_impact;

  const riskLevel = stress?.risk_level ?? stress?.risk ?? "UNKNOWN";

  const breakdown = Array.isArray(stress?.breakdown) ? stress.breakdown : [];

  const sortedBreakdown = [...breakdown].sort(
    (a, b) => Number(a.portfolio_impact || 0) - Number(b.portfolio_impact || 0),
  );

  const topRisks = sortedBreakdown.slice(0, 3);

  const targetAsset =
    hedge?.target_asset ?? hedge?.target_symbol ?? hedge?.symbol;

  const proposedTrim =
    hedge?.proposed_trim ??
    hedge?.proposed_trim_percentage ??
    hedge?.trim_percentage;

  const hedgeType =
    hedge?.hedge_type ?? hedge?.type ?? "CONCENTRATION_REDUCTION";

  const recommendation =
    hedge?.recommendation ??
    "Review the highest-risk portfolio exposures under this scenario.";

  return (
    <section className="data-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DECISION SUPPORT</span>

          <h3>Risk & Recommendation</h3>
        </div>

        <span className="data-source">DETERMINISTIC</span>
      </div>

      {/* RISK SUMMARY */}

      <div className="recommendation-grid">
        {portfolioImpact !== undefined && (
          <div className="recommendation-stat">
            <span>PORTFOLIO IMPACT</span>

            <strong
              className={Number(portfolioImpact) < 0 ? "negative" : "positive"}
            >
              {Number(portfolioImpact) > 0 ? "+" : ""}
              {Number(portfolioImpact).toFixed(2)}%
            </strong>
          </div>
        )}

        <div className="recommendation-stat">
          <span>RISK LEVEL</span>

          <strong>{riskLevel}</strong>
        </div>
      </div>

      {/* TOP RISKS */}

      {topRisks.length > 0 && (
        <div className="recommendation-block">
          <div className="recommendation-block-title">TOP RISK EXPOSURES</div>

          <div className="risk-position-list">
            {topRisks.map((item, index) => (
              <div className="risk-position" key={`${item.symbol}-${index}`}>
                <span className="risk-position-symbol">{item.symbol}</span>

                <span className="risk-position-impact">
                  {Number(item.portfolio_impact) > 0 ? "+" : ""}
                  {Number(item.portfolio_impact || 0).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECOMMENDATION */}

      {hedge && (
        <div className="recommendation-block recommendation-highlight">
          <div className="recommendation-block-title">RECOMMENDED ACTION</div>

          <p className="recommendation-text">{recommendation}</p>

          <div className="recommendation-details">
            {targetAsset && (
              <div>
                <span>TARGET</span>
                <strong>{targetAsset}</strong>
              </div>
            )}

            {proposedTrim !== undefined && (
              <div>
                <span>PROPOSED TRIM</span>
                <strong>{Number(proposedTrim).toFixed(1)}%</strong>
              </div>
            )}

            <div>
              <span>TYPE</span>
              <strong>{hedgeType}</strong>
            </div>
          </div>

          <div className="recommendation-disclaimer">
            {hedge?.disclaimer ||
              "Scenario-based proposal for risk analysis; not an optimized trading instruction."}
          </div>
        </div>
      )}
    </section>
  );
}
