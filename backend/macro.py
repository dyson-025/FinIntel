# ============================================================
# SIMPLE MACRO DATA
# ============================================================

MACRO_DATA = {
    "interest_rates": {
        "name": "US Federal Funds Rate",
        "value": 5.25,
        "unit": "%",
        "description": "Policy interest rate level used as macroeconomic context."
    },

    "inflation": {
        "name": "US Inflation",
        "value": 3.0,
        "unit": "%",
        "description": "Inflation rate used as macroeconomic context."
    },

    "unemployment": {
        "name": "US Unemployment Rate",
        "value": 4.0,
        "unit": "%",
        "description": "Unemployment rate used as macroeconomic context."
    }
}


from provenance import create_source


def get_macro_data():
    return {
        "values": MACRO_DATA,

        "source": create_source(
            provider="FinIntel Demo Macro Dataset",
            status="DEMO"
        )
    }