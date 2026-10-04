export default function NewsPanel({ data, enabled }) {
  if (!enabled) {
    return null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const newsItems = [];

  const addNews = (symbol, value) => {
    if (!value) {
      return;
    }

    const articles = Array.isArray(value)
      ? value
      : Array.isArray(value?.news)
        ? value.news
        : [value];

    articles.forEach((article) => {
      if (!article || typeof article !== "object") {
        return;
      }

      // yfinance may return the actual article inside "content"
      const content =
        article.content && typeof article.content === "object"
          ? article.content
          : article;

      const title =
        content.title ||
        content.headline ||
        article.title ||
        "Untitled article";

      const description =
        content.description || content.summary || article.description || "";

      const provider =
        content.provider?.displayName ||
        content.provider?.name ||
        article.publisher ||
        article.provider ||
        "Unknown source";

      const sourceUrl =
        content.clickThroughUrl?.url ||
        content.canonicalUrl?.url ||
        content.link ||
        article.link ||
        article.url ||
        null;

      const publishedAt =
        content.pubDate ||
        content.displayTime ||
        article.providerPublishTime ||
        article.published_at ||
        null;

      newsItems.push({
        symbol,
        title,
        description,
        provider,
        sourceUrl,
        publishedAt,
      });
    });
  };

  Object.entries(data).forEach(([key, value]) => {
    if (key.endsWith("_news")) {
      const symbol = key.replace("_news", "").toUpperCase();
      addNews(symbol, value);
    }
  });

  if (newsItems.length === 0) {
    return (
      <section className="data-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MARKET INTELLIGENCE</span>

            <h3>Latest News</h3>
          </div>

          <span className="data-source">UNAVAILABLE</span>
        </div>

        <div className="news-empty">
          <strong>NO CURRENT ARTICLES</strong>

          <p>
            No news articles were returned by the configured market data source
            for this asset at retrieval time.
          </p>
        </div>
      </section>
    );
  }

  // Remove duplicate articles
  const uniqueNews = newsItems.filter((item, index, array) => {
    return (
      index ===
      array.findIndex(
        (other) =>
          other.title === item.title && other.sourceUrl === item.sourceUrl,
      )
    );
  });

  // Keep the panel compact
  const visibleNews = uniqueNews.slice(0, 6);

  const formatDate = (value) => {
    if (!value) {
      return null;
    }

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return date.toLocaleString();
    } catch {
      return null;
    }
  };

  return (
    <section className="data-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MARKET INTELLIGENCE</span>

          <h3>Latest News</h3>
        </div>

        <span className="data-source">{visibleNews.length} ARTICLES</span>
      </div>

      <div className="news-list">
        {visibleNews.map((article, index) => {
          const formattedDate = formatDate(article.publishedAt);

          return (
            <article className="news-card" key={`${article.title}-${index}`}>
              <div className="news-card-top">
                <span className="news-symbol">{article.symbol}</span>

                <span className="news-provider">{article.provider}</span>
              </div>

              <h4 className="news-title">{article.title}</h4>

              {article.description && (
                <p className="news-description">{article.description}</p>
              )}

              <div className="news-meta">
                {formattedDate && <span>{formattedDate}</span>}

                {article.sourceUrl && (
                  <a href={article.sourceUrl} target="_blank" rel="noreferrer">
                    Read article →
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
