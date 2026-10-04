import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function HistoricalChart({ symbol, history }) {
  if (!history || history.length === 0) {
    return null;
  }

  const chartData = history.map((item) => ({
    date: item.date,
    close: item.close,
  }));

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <p className="chart-label">HISTORICAL PRICE</p>
          <h3>{symbol}</h3>
        </div>

        <span className="chart-points">{history.length} trading days</span>
      </div>

      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />

            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />

            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Close"]}
              labelFormatter={(label) => `Date: ${label}`}
            />

            <Line
              type="monotone"
              dataKey="close"
              stroke="#7dd3fc"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
