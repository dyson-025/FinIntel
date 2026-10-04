from analysis import (
    calculate_scenario,
    calculate_portfolio_scenario,
    calculate_multi_asset_stress,
    calculate_hedge_recommendation
)
import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from tools import (
    get_stock_quote,
    get_company_overview,
    get_news,
    get_historical_prices,
    get_asset_correlation
)
from rag import search_historical_events
from macro import get_macro_data
# ============================================================
# ENVIRONMENT
# ============================================================
load_dotenv()
# ============================================================
# GROQ LLM
# ============================================================
llm = ChatGroq(
    model="openai/gpt-oss-20b",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY")
)
# ============================================================
# SUPERVISOR
# ============================================================
SUPERVISOR_PROMPT = """
You are the Supervisor of FinIntel, an AI financial
intelligence terminal.
Your job is to understand ANY financial question and decide
which data sources are actually required.
You DO NOT answer the question.
You only create the execution plan.
============================================================
AVAILABLE TOOLS
============================================================
MARKET:
- latest stock price
- daily change
- trading volume
COMPANY:
- company description
- sector
- industry
- market cap
- P/E
- profit margin
- revenue growth
NEWS:
- recent financial news
- news summaries
- news sentiment
HISTORICAL:
- historical market events
- previous interest-rate environments
- previous technology selloffs
- previous market crashes
- historical semiconductor events
- similar historical situations
HISTORICAL_MARKET:
- historical stock prices
- historical OHLCV data
- performance over a specified date range
- start price
- end price
- percentage change
- highest and lowest price
- historical price series
CORRELATION:
- historical return correlation between multiple assets
- cross-asset relationship analysis
- portfolio co-movement
- correlation matrix
MACRO:
- interest rates
- inflation
- unemployment
- macroeconomic conditions
RISK:
- scenario analysis
- percentage price shocks
- portfolio impact calculations
============================================================
OUTPUT FORMAT
============================================================
Return ONLY valid JSON.
NORMAL ASSET QUESTION:
{
    "assets": ["NVDA"],
    "tools": ["MARKET", "COMPANY"],
    "scenario": null,
    "historical_period": null,
    "question_type": "asset_analysis",
    "reason": "Analyze a specific asset"
}
GENERAL CONCEPTUAL QUESTION:
{
    "assets": [],
    "tools": [],
    "scenario": null,
    "historical_period": null,
    "question_type": "general",
    "reason": "Conceptual financial question"
}
HISTORICAL EVENT QUESTION:
{
    "assets": [],
    "tools": ["HISTORICAL"],
    "scenario": null,
    "historical_period": null,
    "question_type": "historical",
    "reason": "Question asks about historical market behavior"
}
MACRO QUESTION:
{
    "assets": [],
    "tools": ["MACRO", "HISTORICAL"],
    "scenario": null,
    "historical_period": null,
    "question_type": "macro",
    "reason": "Question concerns macroeconomic conditions"
}
HISTORICAL MARKET QUESTION:
{
    "assets": ["AMD"],
    "tools": ["HISTORICAL_MARKET"],
    "scenario": null,
    "historical_period": {
        "start_date": "2022-01-01",
        "end_date": "2023-01-01"
    },
    "question_type": "historical_market",
    "reason": "Retrieve AMD historical market performance during 2022"
}
SINGLE STOCK SCENARIO:
{
    "assets": ["NVDA"],
    "tools": ["MARKET", "RISK"],
    "scenario": {
        "type": "price_change",
        "change_percent": -20
    },
    "historical_period": null,
    "question_type": "scenario",
    "reason": "Calculate the impact of a 20% NVDA decline"
}
PORTFOLIO SCENARIO:
{
    "assets": ["AMD", "NVDA", "AAPL"],
    "tools": ["RISK"],
    "scenario": {
        "type": "portfolio_change",
        "change_percent": -10,
        "positions": [
            {
                "symbol": "AMD",
                "weight": 0.30
            },
            {
                "symbol": "NVDA",
                "weight": 0.40
            },
            {
                "symbol": "AAPL",
                "weight": 0.30
            }
        ]
    },
    "historical_period": null,
    "question_type": "portfolio_scenario",
    "reason": "Calculate portfolio impact from a 10% decline"
}
ASSET COMPARISON QUESTION:
{
    "assets": ["NVDA", "AMD"],
    "tools": ["MARKET", "COMPANY", "CORRELATION"],
    "scenario": null,
    "historical_period": null,
    "question_type": "asset_analysis",
    "reason": "Compare fundamentals, market data, and historical co-movement"
}
CORRELATION QUESTION:
{
    "assets": ["NVDA", "AMD"],
    "tools": ["CORRELATION"],
    "scenario": null,
    "historical_period": null,
    "question_type": "correlation",
    "reason": "Measure historical co-movement between NVDA and AMD"
}
MULTI-ASSET STRESS SCENARIO FORMAT
Use this when different assets have different percentage shocks.
Example question:
"If AMD falls 20%, NVDA falls 15%, and AAPL falls 5%,
what is the impact on a portfolio weighted
30% AMD, 40% NVDA, 30% AAPL?"
Return:
{
    "assets": ["AMD", "NVDA", "AAPL"],
    "tools": ["RISK"],
    "scenario": {
        "type": "multi_asset_stress",
        "positions": [
            {
                "symbol": "AMD",
                "weight": 0.30,
                "scenario_change": -20
            },
            {
                "symbol": "NVDA",
                "weight": 0.40,
                "scenario_change": -15
            },
            {
                "symbol": "AAPL",
                "weight": 0.30,
                "scenario_change": -5
            }
        ]
    },
    "reason": "Calculate portfolio impact using asset-specific shocks"
}
============================================================
QUESTION CLASSIFICATION
============================================================
First determine what kind of question the user is asking.
Possible types:
1. general
2. asset_analysis
3. historical
4. historical_market
5. macro
6. scenario
7. portfolio_scenario
8. correlation
============================================================
GENERAL QUESTIONS
============================================================
Use question_type = "general" when the user asks about a
financial concept, mechanism, or broad relationship without
asking about a specific current asset or historical event.
Examples:
"What is P/E?"
"How does inflation affect stocks?"
"How does a political statement affect stocks?"
"What is market capitalization?"
"Why do interest rates matter?"
"What is diversification?"
For these:
- assets should normally be []
- tools should normally be []
- do NOT select NEWS merely because the question mentions
  politics, news, statements, or events
- do NOT select MARKET unless a specific asset is being analyzed
- do NOT select HISTORICAL unless historical evidence is
  explicitly requested
============================================================
ASSET ANALYSIS
============================================================
Use asset_analysis when the user asks about a specific
company, stock, ETF, or identifiable asset.
Examples:
"Tell me about AMD"
"Why did NVIDIA fall?"
"Analyze Apple"
"Compare AMD and NVIDIA"
Possible tools:
MARKET
COMPANY
NEWS
HISTORICAL
COMPARISON RULE
When the user compares two or more assets or companies, include CORRELATION in addition to MARKET and COMPANY.
Examples:
- "Compare NVIDIA and AMD"
- "Compare AAPL and MSFT"
- "Compare Tesla and Ford"
For comparisons involving two or more assets, the selected tools should normally include:
MARKET
COMPANY
CORRELATION
Do not use CORRELATION when only one asset is discussed.
Choose only tools that are actually useful.
============================================================
NEWS QUESTIONS
============================================================
Use NEWS when the user asks about:
- recent news
- today's movement
- breaking events
- what caused a recent move
- current announcements
Example:
"Why did AMD fall today?"
Return:
{
    "assets": ["AMD"],
    "tools": ["MARKET", "NEWS"],
    ...
}
============================================================
HISTORICAL EVENT QUESTIONS
============================================================
Use HISTORICAL when the user explicitly asks about:
- previous events
- historical behavior
- past crashes
- previous rate hikes
- historical patterns
- similar past situations
Examples:
"How did technology stocks behave during the 2022 rate hikes?"
"What happened to semiconductor stocks during previous selloffs?"
Use HISTORICAL for contextual historical events.
Do NOT use HISTORICAL_MARKET unless the user is asking
for actual historical price/performance data.
============================================================
HISTORICAL MARKET QUESTIONS
============================================================
Use HISTORICAL_MARKET when the user asks for actual
historical price or performance data for a specific asset.
Examples:
"How did AMD perform during 2022?"
"What was NVIDIA's return in 2023?"
"How much did AAPL fall during 2020?"
"Show me AMD's stock performance from 2022 to 2023."
"How did NVDA perform between January 2022 and January 2023?"
For a full calendar year:
2022:
start_date = "2022-01-01"
end_date = "2023-01-01"
2023:
start_date = "2023-01-01"
end_date = "2024-01-01"
For explicit date ranges:
"AMD from March 1 2022 to June 1 2022"
Return:
{
    "assets": ["AMD"],
    "tools": ["HISTORICAL_MARKET"],
    "scenario": null,
    "historical_period": {
        "start_date": "2022-03-01",
        "end_date": "2022-06-01"
    },
    "question_type": "historical_market",
    "reason": "Retrieve AMD historical price performance"
}
============================================================
COMBINED HISTORICAL QUESTIONS
============================================================
A question can require BOTH:
HISTORICAL_MARKET
+
HISTORICAL
Example:
"How did AMD perform during the 2022 rate hikes?"
Use:
{
    "assets": ["AMD"],
    "tools": ["HISTORICAL_MARKET", "HISTORICAL"],
    "scenario": null,
    "historical_period": {
        "start_date": "2022-01-01",
        "end_date": "2023-01-01"
    },
    "question_type": "historical_market",
    "reason": "Combine AMD historical performance with historical rate-hike context"
}
The distinction is important:
HISTORICAL_MARKET
=
actual numerical market performance.
HISTORICAL
=
historical events and contextual evidence.
============================================================
MACRO QUESTIONS
============================================================
Use MACRO when the question explicitly involves:
- interest rates
- inflation
- unemployment
- monetary policy
- broad economic conditions
HISTORICAL can be added when historical context is useful.
Example:
"How do higher interest rates affect technology stocks?"
→ MACRO + HISTORICAL
============================================================
SINGLE STOCK SCENARIOS
============================================================
For:
"What happens if AMD falls 20%?"
Use:
tools = ["MARKET", "RISK"]
scenario:
{
    "type": "price_change",
    "change_percent": -20
}
Always include MARKET because the current price
is required.
============================================================
PORTFOLIO SCENARIOS
============================================================
For:
"If AMD is 30%, NVDA is 40%, and AAPL is 30%,
what happens if all three fall 10%?"
Use:
tools = ["RISK"]
scenario:
{
    "type": "portfolio_change",
    "change_percent": -10,
    "positions": [...]
}
Portfolio weights must be decimals.
30% = 0.30
40% = 0.40
50% = 0.50
Never invent missing portfolio positions or weights.
============================================================
CORRELATION QUESTIONS
Use CORRELATION when the user asks:
- how two or more assets move together
- how correlated two assets are
- whether assets have similar historical co-movement
- about cross-asset relationship or co-movement
- whether portfolio positions have concentration in similar movements
Do NOT use HISTORICAL_MARKET as a substitute for correlation.
Correlation does not require a user-specified date range because the
correlation tool uses its default historical period.
IMPORTANT RULES
============================================================
- Extract stock/company symbols when possible.
- Use only tools that are actually useful.
- Do not select tools merely because they sound related.
- Do not answer the financial question.
- Do not invent data.
- Do not invent portfolio positions.
- Do not invent portfolio weights.
- Return valid JSON only.
- Use HISTORICAL_MARKET for actual historical
  price/performance questions.
- Use HISTORICAL for historical events/context.
- Use CORRELATION when historical co-movement between multiple assets
  is being requested.
- Do NOT use HISTORICAL_MARKET as a substitute for correlation.
- A question may require both.
- When using HISTORICAL_MARKET, extract the date range.
- Dates must use YYYY-MM-DD format.
- For a full calendar year, use January 1 of that year
  through January 1 of the following year.
- If a historical period cannot reasonably be determined,
  do not invent exact dates.
- If a historical question does not identify a specific
  asset, do not invent an asset symbol.
"""
def supervise(question: str):
    response = llm.invoke([
        SystemMessage(content=SUPERVISOR_PROMPT),
        HumanMessage(content=question)
    ])
    text = response.content.strip()
    text = text.replace("```json", "")
    text = text.replace("```", "")
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "assets": [],
            "tools": [],
            "scenario": None,
            "historical_period": None,
            "question_type": "general",
            "reason": "Supervisor returned invalid JSON.",
            "raw_response": text
        }
# ============================================================
# FINANCIAL ANALYST
# ============================================================
ANALYST_PROMPT = """
You are the Financial Analyst inside FinIntel.
You receive:
1. The user's financial question.
2. The Supervisor's plan.
3. Data collected from financial APIs.
4. Macro-economic data.
5. Historical event evidence from the retrieval system.
6. Historical market price data.
7. Deterministic scenario calculations.
============================================================
CORE EVIDENCE RULE
============================================================
Separate THREE types of information:
1. SUPPLIED DATA
2. GENERAL FINANCIAL EXPLANATION
3. INTERPRETATION
Never mix them together.
NUMERICAL COMPARISON RULE
When comparing supplied numerical values, check the actual values before stating which asset is higher, lower, faster, or more profitable.
Do not reverse, infer, or invent numeric comparisons.
For factual claims about:
- current prices
- company metrics
- current news
- historical events
- historical market performance
- macroeconomic values
- calculated scenarios
use ONLY the supplied data.
Never invent:
- prices
- percentages
- dates
- financial metrics
- news
- company information
- historical performance
============================================================
HISTORICAL MARKET DATA
============================================================
When historical_market data is supplied:
Use the supplied numerical values directly.
You may explain:
- starting price
- ending price
- absolute change
- percentage change
- highest price
- lowest price
- number of trading days
- broad performance during the supplied period
Example:
If supplied data says:
start_price = 100
end_price = 120
change_percent = 20
say:
"The supplied historical data shows a 20% increase
from the start price to the end price."
Do NOT claim that the historical performance predicts
future performance.
Do NOT invent causes for the historical price movement.
If historical event evidence is also supplied, use it
as contextual evidence rather than automatically claiming
causation.
============================================================
HISTORICAL EVENTS
============================================================
Historical retrieval results are contextual evidence.
Use them only when directly relevant.
Clearly distinguish:
ACTUAL HISTORICAL MARKET DATA
from
HISTORICAL EVENT CONTEXT.
Example:
The price API may show:
"AMD declined 55% during the supplied period."
The RAG data may show:
"2022 technology stocks experienced pressure
from higher interest rates."
You may explain that these are two separate pieces
of evidence.
Do NOT automatically claim:
"Interest rates caused AMD to fall 55%."
unless the supplied evidence explicitly establishes that.
============================================================
GENERAL QUESTIONS
============================================================
If question_type is "general":
You MAY use general financial knowledge.
Examples:
"What is P/E?"
"How does inflation affect stocks?"
"How does a political statement affect stocks?"
"What is diversification?"
Do not pretend general explanations came from APIs.
Do not fabricate current market data.
Do not fabricate historical examples.
============================================================
CURRENT MARKET DATA
============================================================
Only discuss current market information when market
data was actually supplied.
Do not invent current prices or movements.
============================================================
NEWS
============================================================
Only describe a news article when actual news data
was supplied.
If NEWS returns no articles:
say that current news evidence was unavailable.
Do NOT invent news.
============================================================
MACRO
============================================================
Only describe macro values using supplied macro data.
The FinIntel demo macro dataset may contain static
demo values.
Do NOT describe those values as live unless the data
explicitly says they are live.
============================================================
SCENARIOS
============================================================
If deterministic scenario calculations are supplied:
- explain the calculation
- use the supplied result
- clearly call it a scenario
- never present it as a prediction
For portfolio scenarios:
- explain total portfolio impact
- explain each position's contribution
- do not invent portfolio monetary value
- do not claim an actual monetary loss unless supplied
============================================================
CORRELATION DATA
When correlation data is supplied:
- use the supplied correlation coefficient directly
- identify the assets being compared
- state the analyzed period when available
- explain the relationship classification when supplied
- do not invent correlation values
- do not interpret correlation as causation
- do not claim that one asset causes another to move
- remember that historical correlation does not guarantee future behavior
CORRELATION HISTORICAL CONTEXT
When correlation data are supplied, recognize that the correlation was calculated from historical return observations.
Do not say that the entire analysis is based on a single point in time when historical correlation data are present.
If historical price series were not retrieved, distinguish that clearly from historical correlation data.
For example:
- Historical price series: not supplied
- Historical correlation: supplied
- Correlation period: use the supplied period
- Observations: use the supplied data_points
Do not invent historical price performance when only correlation data are available.
DO NOT OVERCLAIM
============================================================
Do not turn correlation into causation.
Do not say:
"X caused Y"
unless supplied evidence explicitly establishes this.
Prefer:
"The supplied data shows..."
"The historical data indicates..."
"The available evidence suggests..."
"This scenario assumes..."
"This is a general financial explanation..."
============================================================
ANSWER STRUCTURE
============================================================
Use this structure when appropriate:
SUMMARY
Give a direct answer.
KEY FACTORS
Explain the main mechanisms or factors.
DATA & EVIDENCE
Include supplied data when relevant.
HISTORICAL CONTEXT
Include directly relevant historical evidence.
RISK / SCENARIO
Include when a scenario calculation exists.
RISKS / LIMITATIONS
Mention important uncertainty or missing evidence.
CONCLUSION
Give a concise conclusion.
============================================================
USER QUESTION
============================================================
{question}
============================================================
SUPERVISOR PLAN
============================================================
{plan}
============================================================
COLLECTED DATA
============================================================
{data}
"""
def build_analyst_data(data: dict):
    """
    Create a compact version of collected data for the LLM.
    Full historical price series stays in data for the frontend,
    while the LLM receives only the useful numerical summary.
    """
    analyst_data = {}
    for key, value in data.items():
        if key != "historical_market":
            analyst_data[key] = value
    if "historical_market" in data:
        analyst_data["historical_market"] = {}
        historical_market = data["historical_market"]
        if isinstance(historical_market, dict):
            for symbol, result in historical_market.items():
                if not isinstance(result, dict):
                    analyst_data["historical_market"][symbol] = result
                    continue
                if "error" in result:
                    analyst_data["historical_market"][symbol] = {
                        "error": result["error"]
                    }
                    continue
                analyst_data["historical_market"][symbol] = {
                    "symbol": result.get("symbol"),
                    "start_date": result.get("start_date"),
                    "end_date": result.get("end_date"),
                    "data_points": result.get("data_points"),
                    "start_price": result.get("start_price"),
                    "end_price": result.get("end_price"),
                    "change": result.get("change"),
                    "change_percent": result.get("change_percent"),
                    "highest_price": result.get("highest_price"),
                    "lowest_price": result.get("lowest_price")
                }
    return analyst_data
def generate_analysis(
    question: str,
    plan: dict,
    data: dict
):
    # Keep full data for the API response,
    # but send compact data to the LLM.
    analyst_data = build_analyst_data(data)
    prompt = ANALYST_PROMPT.format(
        question=question,
        plan=json.dumps(plan, indent=2),
        data=json.dumps(analyst_data, indent=2)
    )
    response = llm.invoke([
        HumanMessage(content=prompt)
    ])
    return response.content
# ============================================================
# COMPLETE FININTEL PIPELINE
# ============================================================
def run_analysis(question: str):
    # --------------------------------------------------------
    # STEP 1: Supervisor
    # --------------------------------------------------------
    plan = supervise(question)
    assets = plan.get("assets", [])
    selected_tools = plan.get("tools", [])
    scenario = plan.get("scenario")
    selected_tools = list(selected_tools)
    data = {}
    # --------------------------------------------------------
    # STEP 2: ENFORCE TOOL DEPENDENCIES
    # --------------------------------------------------------
    # Single-stock price scenarios require current market data.
    if (
        "RISK" in selected_tools
        and scenario
        and scenario.get("type") == "price_change"
    ):
        if "MARKET" not in selected_tools:
            selected_tools.append("MARKET")
            plan["tools"] = selected_tools
    # Company or historical analysis of a specific asset
    # benefits from current market context.
    if assets and (
        "COMPANY" in selected_tools
        or "HISTORICAL" in selected_tools
    ):
        if "MARKET" not in selected_tools:
            selected_tools.append("MARKET")
            plan["tools"] = selected_tools
    # Multi-asset stress benefits from cross-asset relationship analysis.
    if (
        scenario
        and scenario.get("type") == "multi_asset_stress"
        and len(assets) >= 2
        and "CORRELATION" not in selected_tools
    ):
        selected_tools.append("CORRELATION")
        plan["tools"] = selected_tools
    # --------------------------------------------------------
    # STEP 3: MARKET / COMPANY / NEWS
    # --------------------------------------------------------
    for symbol in assets:
        symbol = symbol.upper()
        if "MARKET" in selected_tools:
            data[f"{symbol}_market"] = get_stock_quote(symbol)
        if "COMPANY" in selected_tools:
            data[f"{symbol}_company"] = get_company_overview(symbol)
        if "NEWS" in selected_tools:
            data[f"{symbol}_news"] = get_news(symbol)
    # --------------------------------------------------------
    # HISTORICAL EVENT RAG
    # --------------------------------------------------------
    if "HISTORICAL" in selected_tools:
        data["historical_events"] = search_historical_events(
            question,
            top_k=3
        )
    # --------------------------------------------------------
    # HISTORICAL MARKET DATA
    # --------------------------------------------------------
    if "HISTORICAL_MARKET" in selected_tools:
        historical_period = plan.get("historical_period")
        if historical_period and assets:
            start_date = historical_period.get("start_date")
            end_date = historical_period.get("end_date")
            if start_date and end_date:
                historical_market = {}
                for symbol in assets:
                    symbol = symbol.upper()
                    historical_market[symbol] = get_historical_prices(
                        symbol=symbol,
                        start_date=start_date,
                        end_date=end_date
                    )
                data["historical_market"] = historical_market
            else:
                data["historical_market"] = {
                    "error": "Historical date range was not provided."
                }
        else:
            data["historical_market"] = {
                "error": (
                    "Historical market data requires "
                    "an asset and date range."
                )
            }
    # --------------------------------------------------------
    # MACRO
    # --------------------------------------------------------
    # --------------------------------------------------------
    # CROSS-ASSET CORRELATION
    # --------------------------------------------------------
    if "CORRELATION" in selected_tools:
        if len(assets) >= 2:
            data["correlation"] = get_asset_correlation(
                symbols=assets,
                period="1y"
            )
        else:
            data["correlation"] = {
                "error": (
                    "Correlation requires at least two assets."
                )
            }
    if "MACRO" in selected_tools:
        data["macro"] = get_macro_data()
       # --------------------------------------------------------
    # STEP 4: RISK / SCENARIO
    # --------------------------------------------------------
    if "RISK" in selected_tools and scenario:
        scenario_type = scenario.get("type")
        # ----------------------------------------------------
        # SINGLE STOCK PRICE SCENARIO
        # ----------------------------------------------------
        if scenario_type == "price_change":
            change_percent = scenario.get(
                "change_percent",
                0
            )
            scenario_results = {}
            for symbol in assets:
                symbol = symbol.upper()
                market_data = data.get(
                    f"{symbol}_market",
                    {}
                )
                current_price = market_data.get("price")
                if current_price is not None:
                    scenario_results[symbol] = (
                        calculate_scenario(
                            current_price=current_price,
                            percentage_change=change_percent
                        )
                    )
                else:
                    scenario_results[symbol] = {
                        "error": "Current market price unavailable"
                    }
            data["scenario_analysis"] = scenario_results
        # ----------------------------------------------------
        # PORTFOLIO SCENARIO
        # ----------------------------------------------------
        elif scenario_type == "portfolio_change":
            change_percent = scenario.get(
                "change_percent",
                0
            )
            positions = scenario.get(
                "positions",
                []
            )
            if positions:
                data["portfolio_scenario"] = (
                    calculate_portfolio_scenario(
                        positions=positions,
                        scenario_change=change_percent
                    )
                )
            else:
                data["portfolio_scenario"] = {
                    "error": "No portfolio positions provided"
                }
        # ----------------------------------------------------
        # MULTI-ASSET STRESS SCENARIO
        # ----------------------------------------------------
        elif scenario_type == "multi_asset_stress":
            positions = scenario.get(
                "positions",
                []
            )
            if positions:
                stress_result = calculate_multi_asset_stress(
                    positions=positions
                )
                data["multi_asset_stress"] = stress_result
                data["hedge_recommendation"] = (
                    calculate_hedge_recommendation(
                        stress_result=stress_result
                    )
                )
            else:
                data["multi_asset_stress"] = {
                    "error": "No multi-asset stress positions provided"
                }
        # --------------------------------------------------------
    # STEP 5: FINANCIAL ANALYST
    # --------------------------------------------------------
    analysis = generate_analysis(
        question=question,
        plan=plan,
        data=data
    )
    # --------------------------------------------------------
    # STEP 6: EXECUTION TRACE
    # --------------------------------------------------------
    execution_trace = [
        {
            "name": "Supervisor",
            "description": "Query decomposition",
            "status": "completed"
        }
    ]
    tool_descriptions = {
        "MARKET": "Live market data retrieval",
        "COMPANY": "Company fundamentals",
        "NEWS": "Financial news retrieval",
        "HISTORICAL": "Historical event retrieval",
        "HISTORICAL_MARKET": "Historical price retrieval",
        "CORRELATION": "Cross-asset correlation analysis",
        "MACRO": "Macroeconomic indicators",
        "RISK": "Deterministic risk calculations"
    }
    for tool in selected_tools:
        execution_trace.append(
            {
                "name": tool,
                "description": tool_descriptions.get(
                    tool,
                    "Financial intelligence"
                ),
                "status": "completed"
            }
        )
    execution_trace.append(
        {
            "name": "Financial Analyst",
            "description": "Evidence-backed reasoning",
            "status": "completed"
        }
    )
    # --------------------------------------------------------
    # STEP 7: FINAL RESPONSE
    # --------------------------------------------------------
    return {
        "question": question,
        "plan": plan,
        "data": data,
        "analysis": analysis,
        "execution_trace": execution_trace
    }
