import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrendPoint } from "@/lib/analytics/types";

export function TrendCharts({
  trends,
  loading,
  periodDays,
}: {
  trends: TrendPoint[];
  loading: boolean;
  periodDays: 7 | 30;
}) {
  const label = periodDays === 7 ? "Weekly" : "Monthly";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label} Trend Charts</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading trends...</p>
        ) : trends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trend data yet.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Impressions and Reach Over Time</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="impressions" stroke="var(--color-chart-1, #2563eb)" strokeWidth={2} />
                    <Line type="monotone" dataKey="reach" stroke="var(--color-chart-2, #10b981)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Engagement Rate and Post Volume</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="engagementRate" stroke="var(--color-chart-3, #f59e0b)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="posts" stroke="var(--color-chart-4, #8b5cf6)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
