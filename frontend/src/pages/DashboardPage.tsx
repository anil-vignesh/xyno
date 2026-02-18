import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Activity, Cloud, Mail, Send, Zap } from "lucide-react";
import { logsApi } from "@/services/logs";
import type { DashboardStats } from "@/types";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  pending: "secondary",
  failed: "destructive",
  bounced: "destructive",
  complained: "outline",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { environment } = useEnvironment();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    logsApi
      .dashboardStats()
      .then(({ data }) => setStats(data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [environment]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading dashboard...</div>;
  }

  const data: DashboardStats = stats ?? {
    total_sent: 0,
    total_failed: 0,
    sent_today: 0,
    sent_last_7_days: 0,
    sent_last_30_days: 0,
    active_integrations: 0,
    active_events: 0,
    total_templates: 0,
    daily_breakdown: [],
    recent_logs: [],
  };

  const statCards = [
    { title: "Sent Today", value: data.sent_today, icon: Send, color: "text-green-600" },
    { title: "Sent (7 days)", value: data.sent_last_7_days, icon: Activity, color: "text-blue-600" },
    { title: "Total Failed", value: data.total_failed, icon: Mail, color: "text-red-600" },
    { title: "Active Integrations", value: data.active_integrations, icon: Cloud, color: "text-purple-600" },
    { title: "Active Events", value: data.active_events, icon: Zap, color: "text-yellow-600" },
    { title: "Templates", value: data.total_templates, icon: Mail, color: "text-indigo-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your email activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {data.daily_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Volume (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.daily_breakdown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" fontSize={12} className="fill-muted-foreground" />
                <YAxis fontSize={12} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius-md)",
                    color: "hsl(var(--card-foreground))",
                    fontSize: 12,
                    boxShadow: "none",
                  }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Legend />
                <Bar dataKey="sent" fill="#22c55e" name="Sent" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Emails</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate("/logs")}>
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.recent_logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No emails sent yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.recipient}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                    <TableCell>
                      {log.event_slug ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.event_slug}</code>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[log.status] || "secondary"}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(log.sent_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/templates/new")}>Create Template</Button>
        <Button variant="outline" onClick={() => navigate("/events")}>Create Event</Button>
        <Button variant="outline" onClick={() => navigate("/integrations")}>Add Integration</Button>
      </div>
    </div>
  );
}
