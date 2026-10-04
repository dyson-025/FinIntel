def calculate_scenario(
    current_price: float,
    percentage_change: float
):
    """
    Calculate the projected price and risk characteristics
    for a single-stock price scenario.
    """

    change = current_price * (percentage_change / 100)
    projected_price = current_price + change

    # Simple deterministic risk classification.
    absolute_change = abs(percentage_change)

    if absolute_change >= 20:
        risk_level = "HIGH"
    elif absolute_change >= 10:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "current_price": round(current_price, 2),
        "scenario_change_percent": percentage_change,
        "estimated_change": round(change, 2),
        "projected_price": round(projected_price, 2),
        "risk_level": risk_level
    }


def calculate_portfolio_scenario(
    positions: list,
    scenario_change: float
):
    """
    Calculate portfolio-level impact for a uniform
    percentage shock across all supplied positions.
    """

    if not positions:
        return {
            "error": "No portfolio positions provided"
        }

    # Validate and normalize weights.
    total_weight = sum(
        float(position.get("weight", 0))
        for position in positions
    )

    if total_weight <= 0:
        return {
            "error": "Portfolio weights must be greater than zero"
        }

    normalized_positions = []

    for position in positions:
        symbol = str(position.get("symbol", "")).upper()
        weight = float(position.get("weight", 0))

        if not symbol:
            continue

        normalized_weight = weight / total_weight

        normalized_positions.append({
            "symbol": symbol,
            "weight": normalized_weight
        })

    if not normalized_positions:
        return {
            "error": "No valid portfolio positions found"
        }

    total_impact = 0
    breakdown = []

    for position in normalized_positions:

        symbol = position["symbol"]
        weight = position["weight"]

        # Contribution of this asset to total portfolio return.
        impact = weight * scenario_change

        total_impact += impact

        breakdown.append({
            "symbol": symbol,
            "weight": round(weight, 4),
            "weight_percent": round(weight * 100, 2),
            "scenario_change": scenario_change,
            "portfolio_impact": round(impact, 2)
        })

    absolute_shock = abs(scenario_change)

    if absolute_shock >= 20:
        risk_level = "HIGH"
    elif absolute_shock >= 10:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "scenario_change_percent": scenario_change,
        "total_portfolio_impact": round(total_impact, 2),
        "portfolio_weight_total": round(
            sum(position["weight"] for position in normalized_positions),
            4
        ),
        "risk_level": risk_level,
        "breakdown": breakdown
    }
def calculate_multi_asset_stress(
    positions: list
):
    """
    Calculate portfolio impact when each asset has
    its own scenario shock.

    Example:
    AMD  -> -20%
    NVDA -> -15%
    AAPL -> -5%
    """

    if not positions:
        return {
            "error": "No portfolio positions provided"
        }

    total_weight = sum(
        float(position.get("weight", 0))
        for position in positions
    )

    if total_weight <= 0:
        return {
            "error": "Portfolio weights must be greater than zero"
        }

    total_impact = 0
    breakdown = []

    for position in positions:
        symbol = str(
            position.get("symbol", "")
        ).upper()

        weight = float(
            position.get("weight", 0)
        )

        shock = float(
            position.get("scenario_change", 0)
        )

        if not symbol:
            continue

        normalized_weight = weight / total_weight

        impact = normalized_weight * shock

        total_impact += impact

        breakdown.append({
            "symbol": symbol,
            "weight_percent": round(
                normalized_weight * 100,
                2
            ),
            "scenario_change_percent": shock,
            "portfolio_impact": round(
                impact,
                2
            )
        })

    absolute_impact = abs(total_impact)

    if absolute_impact >= 15:
        risk_level = "HIGH"
    elif absolute_impact >= 7:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "total_portfolio_impact": round(
            total_impact,
            2
        ),
        "risk_level": risk_level,
        "breakdown": breakdown
    }    
def calculate_hedge_recommendation(
    stress_result: dict
):
    """
    Generate a simple, explainable hedge proposal based on
    the largest portfolio risk contributor.

    This is a scenario-based recommendation, not an
    optimized trading strategy.
    """

    if not stress_result:
        return {
            "error": "No stress-test result available"
        }

    breakdown = stress_result.get("breakdown", [])

    if not breakdown:
        return {
            "error": "No portfolio risk breakdown available"
        }

    # Find the position contributing the most negative impact.
    highest_risk_position = min(
        breakdown,
        key=lambda item: item.get(
            "portfolio_impact",
            0
        )
    )

    symbol = highest_risk_position.get("symbol")
    current_weight = highest_risk_position.get(
        "weight_percent",
        0
    )
    contribution = highest_risk_position.get(
        "portfolio_impact",
        0
    )

    # Simple 5 percentage-point trim proposal.
    proposed_trim = min(
        5.0,
        current_weight
    )

    proposed_weight = current_weight - proposed_trim

    if contribution < 0:

        recommendation = (
            f"Consider reducing {symbol} exposure by "
            f"approximately {proposed_trim:.1f} percentage points "
            f"from the stressed allocation."
        )

        rationale = (
            f"{symbol} is currently the largest negative "
            f"contributor to the modeled portfolio stress."
        )

    else:

        recommendation = (
            "No immediate concentration hedge is indicated "
            "by the supplied stress scenario."
        )

        rationale = (
            "The supplied stress test does not show a negative "
            "portfolio contributor."
        )

    return {
        "hedge_type": "CONCENTRATION_REDUCTION",
        "target_asset": symbol,
        "current_weight_percent": round(
            current_weight,
            2
        ),
        "proposed_trim_percent": round(
            proposed_trim,
            2
        ),
        "proposed_weight_percent": round(
            proposed_weight,
            2
        ),
        "stress_contribution_percent": round(
            contribution,
            2
        ),
        "recommendation": recommendation,
        "rationale": rationale,
        "disclaimer": (
            "Scenario-based proposal for risk analysis; "
            "not an optimized trading instruction."
        )
    }