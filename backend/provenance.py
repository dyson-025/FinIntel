from datetime import datetime, timezone


def create_source(
    provider: str,
    status: str,
    url: str | None = None
):
    """
    Create standardized provenance metadata for a data source.
    """

    return {
        "provider": provider,
        "status": status,
        "url": url,
        "retrieved_at": datetime.now(timezone.utc).isoformat()
    }