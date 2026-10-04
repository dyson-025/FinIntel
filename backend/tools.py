import yfinance as yf
from provenance import create_source


# ============================================================
# MARKET
# ============================================================

def get_stock_quote(symbol: str):

    symbol = symbol.upper()

    try:
        ticker = yf.Ticker(symbol)
        history = ticker.history(period="5d")

        if history.empty:
            return {
                "symbol": symbol,
                "error": "No market data found"
            }

        latest = history.iloc[-1]
        price = float(latest["Close"])

        if len(history) >= 2:
            previous = float(history.iloc[-2]["Close"])
            change = price - previous
            change_percent = (change / previous) * 100
        else:
            change = None
            change_percent = None

        return {
            "symbol": symbol,
            "price": round(price, 2),
            "change": round(change, 2) if change is not None else None,
            "change_percent": (
                round(change_percent, 2)
                if change_percent is not None
                else None
            ),
            "volume": int(latest["Volume"]),
            "source": create_source(
                provider="Yahoo Finance",
                status="LIVE",
                url=f"https://finance.yahoo.com/quote/{symbol}"
            )
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e)
        }


# ============================================================
# COMPANY
# ============================================================

def get_company_overview(symbol: str):

    symbol = symbol.upper()

    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        if not info:
            return {
                "symbol": symbol,
                "error": "No company data found"
            }

        return {
            "symbol": symbol,
            "name": info.get("longName"),
            "description": info.get("longBusinessSummary"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "profit_margin": info.get("profitMargins"),
            "revenue_growth": info.get("revenueGrowth")
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e)
        }


# ============================================================
# NEWS
# ============================================================

def get_news(symbol: str):

    symbol = symbol.upper()

    try:
        ticker = yf.Ticker(symbol)

        # Explicit yfinance news API.
        news = ticker.get_news(
            count=8,
            tab="news"
        )

        articles = []

        for item in news or []:
            if not isinstance(item, dict):
                continue

            content = item.get("content", {})
            if not isinstance(content, dict):
                content = {}

            title = (
                content.get("title")
                or item.get("title")
            )

            summary = (
                content.get("summary")
                or content.get("description")
                or item.get("summary")
                or ""
            )

            provider_data = content.get("provider", {})
            if not isinstance(provider_data, dict):
                provider_data = {}

            publisher = (
                provider_data.get("displayName")
                or provider_data.get("name")
                or item.get("publisher")
                or "Yahoo Finance"
            )

            canonical_url = content.get("canonicalUrl", {})
            click_url = content.get("clickThroughUrl", {})

            if not isinstance(canonical_url, dict):
                canonical_url = {}

            if not isinstance(click_url, dict):
                click_url = {}

            url = (
                canonical_url.get("url")
                or click_url.get("url")
                or item.get("link")
                or item.get("url")
            )

            published_at = (
                content.get("pubDate")
                or content.get("displayTime")
                or item.get("providerPublishTime")
                or None
            )

            # Skip malformed records.
            if not title:
                continue

            articles.append({
                "symbol": symbol,
                "title": title,
                "summary": summary,
                "publisher": publisher,
                "url": url,
                "published_at": published_at,
                "source": create_source(
                    provider=publisher,
                    status="LIVE",
                    url=url
                )
            })

        return articles

    except Exception as e:
        return {
            "error": str(e),
            "articles": []
        }


# ============================================================
# HISTORICAL MARKET DATA
# ============================================================

def get_historical_prices(
    symbol: str,
    start_date: str,
    end_date: str
):

    symbol = symbol.upper()

    try:
        ticker = yf.Ticker(symbol)

        history = ticker.history(
            start=start_date,
            end=end_date
        )

        if history.empty:
            return {
                "symbol": symbol,
                "error": "No historical market data found"
            }

        records = []

        for date, row in history.iterrows():
            records.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"])
            })

        first_close = records[0]["close"]
        last_close = records[-1]["close"]

        total_change = last_close - first_close
        percentage_change = (
            (total_change / first_close) * 100
            if first_close != 0
            else 0
        )

        highest_price = max(
            record["high"] for record in records
        )

        lowest_price = min(
            record["low"] for record in records
        )

        return {
            "symbol": symbol,
            "start_date": start_date,
            "end_date": end_date,
            "data_points": len(records),
            "start_price": first_close,
            "end_price": last_close,
            "change": round(total_change, 2),
            "change_percent": round(percentage_change, 2),
            "highest_price": highest_price,
            "lowest_price": lowest_price,
            "history": records,
            "source": create_source(
                provider="Yahoo Finance",
                status="HISTORICAL",
                url=f"https://finance.yahoo.com/quote/{symbol}/history"
            )
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e)
        }


# ============================================================
# CROSS-ASSET CORRELATION
# ============================================================

def get_asset_correlation(
    symbols: list[str],
    period: str = "1y"
):
    """
    Calculate historical return correlation between assets.

    Uses daily closing prices over the requested period.
    """

    symbols = [
        symbol.upper().strip()
        for symbol in symbols
        if symbol
    ]

    # Remove duplicates while preserving order.
    symbols = list(dict.fromkeys(symbols))

    if len(symbols) < 2:
        return {
            "error": "Correlation requires at least two assets."
        }

    try:
        import pandas as pd

        price_series = {}

        for symbol in symbols:
            ticker = yf.Ticker(symbol)

            history = ticker.history(
                period=period,
                auto_adjust=False
            )

            if history.empty:
                continue

            close = history["Close"]

            # Defensive handling in case yfinance returns
            # a DataFrame instead of a Series.
            if isinstance(close, pd.DataFrame):
                close = close.iloc[:, 0]

            price_series[symbol] = close

        if len(price_series) < 2:
            return {
                "error": "Insufficient historical data for correlation."
            }

        prices = pd.DataFrame(price_series)

        # Percentage daily returns.
        returns = prices.pct_change().dropna()

        if returns.empty:
            return {
                "error": "Unable to calculate daily returns."
            }

        correlation_matrix = returns.corr()

        matrix = {}

        for symbol in correlation_matrix.columns:
            matrix[symbol] = {}

            for other_symbol in correlation_matrix.columns:
                value = correlation_matrix.loc[
                    symbol,
                    other_symbol
                ]

                matrix[symbol][other_symbol] = round(
                    float(value),
                    4
                )

        pairwise = []

        for index, symbol_a in enumerate(
            correlation_matrix.columns
        ):
            for symbol_b in correlation_matrix.columns[index + 1:]:

                correlation = float(
                    correlation_matrix.loc[
                        symbol_a,
                        symbol_b
                    ]
                )

                if correlation >= 0.7:
                    relationship = "HIGH POSITIVE"
                elif correlation >= 0.3:
                    relationship = "MODERATE POSITIVE"
                elif correlation > -0.3:
                    relationship = "LOW / MIXED"
                elif correlation > -0.7:
                    relationship = "MODERATE NEGATIVE"
                else:
                    relationship = "HIGH NEGATIVE"

                pairwise.append({
                    "asset_a": symbol_a,
                    "asset_b": symbol_b,
                    "correlation": round(
                        correlation,
                        4
                    ),
                    "relationship": relationship
                })

        return {
            "symbols": list(correlation_matrix.columns),
            "period": period,
            "data_points": len(returns),
            "correlation_matrix": matrix,
            "pairwise": pairwise,
            "source": create_source(
                provider="Yahoo Finance",
                status="HISTORICAL",
                url="https://finance.yahoo.com/"
            )
        }

    except Exception as e:
        return {
            "error": str(e)
        }
