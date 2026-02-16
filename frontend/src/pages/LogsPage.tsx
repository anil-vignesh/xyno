import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Search } from "lucide-react";
import { logsApi } from "@/services/logs";
import type { EmailLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  pending: "secondary",
  failed: "destructive",
  bounced: "destructive",
  complained: "outline",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== "all") params[k] = v;
      });
      const { data } = await logsApi.list(params);
      setLogs(data.results);
      setTotalCount(data.count);
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const updateFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Email Logs</h2>
        <p className="text-muted-foreground">View all emails sent through Xyno</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipient, subject..."
            className="w-64"
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>
        <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complained</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              <p>No logs found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="text-sm">
                      {new Date(log.sent_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.recipient}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                    <TableCell>
                      {log.event_name ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.event_slug}</code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[log.status] || "secondary"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{totalCount} total logs</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="flex items-center text-sm">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Recipient</div>
                <div>{selectedLog.recipient}</div>
                <div className="text-muted-foreground">Subject</div>
                <div>{selectedLog.subject}</div>
                <div className="text-muted-foreground">Status</div>
                <div>
                  <Badge variant={STATUS_COLORS[selectedLog.status] || "secondary"}>
                    {selectedLog.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground">Event</div>
                <div>{selectedLog.event_name || "-"}</div>
                <div className="text-muted-foreground">Template</div>
                <div>{selectedLog.template_name || "-"}</div>
                <div className="text-muted-foreground">Integration</div>
                <div>{selectedLog.integration_name || "-"}</div>
                <div className="text-muted-foreground">SES Message ID</div>
                <div className="break-all font-mono text-xs">{selectedLog.ses_message_id || "-"}</div>
                <div className="text-muted-foreground">Sent At</div>
                <div>{new Date(selectedLog.sent_at).toLocaleString()}</div>
              </div>
              {selectedLog.error_message && (
                <div>
                  <div className="mb-1 text-muted-foreground">Error</div>
                  <pre className="overflow-x-auto rounded bg-destructive/10 p-2 text-xs text-destructive">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}
              {Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="mb-1 text-muted-foreground">Metadata</div>
                  <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
