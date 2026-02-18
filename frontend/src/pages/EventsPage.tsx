import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpCircle, Code, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { eventsApi } from "@/services/events";
import { integrationsApi } from "@/services/integrations";
import { templatesApi } from "@/services/templates";
import type { EmailTemplate, Event, SESIntegration } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function EventsPage() {
  const { environment } = useEnvironment();
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [integrations, setIntegrations] = useState<SESIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEvent, setTestEvent] = useState<Event | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [testData, setTestData] = useState<Record<string, string>>({});
  const [testSending, setTestSending] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    template: "",
    integration: "",
    is_active: true,
  });

  const fetchData = async () => {
    try {
      const [eventsRes, templatesRes, integrationsRes] = await Promise.all([
        eventsApi.list(),
        templatesApi.list(),
        integrationsApi.list(),
      ]);
      setEvents(eventsRes.data.results);
      setTemplates(templatesRes.data.results);
      setIntegrations(integrationsRes.data.results);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [environment]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ name: "", description: "", template: "", integration: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setForm({
      name: event.name,
      description: event.description,
      template: event.template?.toString() || "",
      integration: event.integration?.toString() || "",
      is_active: event.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        template: form.template ? Number(form.template) : null,
        integration: form.integration ? Number(form.integration) : null,
        is_active: form.is_active,
      };
      if (editingEvent) {
        await eventsApi.update(editingEvent.id, payload);
        toast.success("Event updated");
      } else {
        await eventsApi.create(payload);
        toast.success("Event created");
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    try {
      await eventsApi.delete(id);
      toast.success("Event deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const handlePromote = async (id: number) => {
    if (!confirm("Promote this event to Production?")) return;
    try {
      const { data } = await eventsApi.promote(id);
      if (data.warnings?.length) {
        toast.warning(`Promoted with warnings: ${data.warnings.join(" ")}`);
      } else {
        toast.success("Event promoted to Production");
      }
    } catch {
      toast.error("Failed to promote event");
    }
  };

  const showTriggerCode = (event: Event) => {
    setSelectedEvent(event);
    setCodeDialogOpen(true);
  };

  const openTest = (event: Event) => {
    setTestEvent(event);
    setTestRecipient("");
    // Pre-populate placeholder fields from the template
    const tpl = templates.find((t) => t.id === event.template);
    const initial: Record<string, string> = {};
    tpl?.placeholders.forEach((p) => { initial[p.name] = p.default_value || ""; });
    setTestData(initial);
    setTestDialogOpen(true);
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEvent) return;
    setTestSending(true);
    try {
      const { data } = await eventsApi.testEvent(testEvent.id, {
        recipient: testRecipient,
        data: testData,
      });
      toast.success(data.detail);
      setTestDialogOpen(false);
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setTestSending(false);
    }
  };

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const triggerCode = selectedEvent
    ? `curl -X POST http://localhost:8000/api/events/trigger/ \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "${selectedEvent.slug}",
    "recipient": "user@example.com",
    "data": {${
      templates
        .find((t) => t.id === selectedEvent.template)
        ?.placeholders.map((p) => `\n      "${p.name}": "${p.default_value || 'value'}"`)

        .join(",") || ""
    }
    }
  }'`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Events</h2>
          <p className="text-muted-foreground">Define events to trigger emails from your applications</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Event
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Zap className="mx-auto mb-2 h-8 w-8" />
              <p>No events yet. Create your first event.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Integration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{event.slug}</code>
                    </TableCell>
                    <TableCell>{event.template_name || <span className="text-muted-foreground">None</span>}</TableCell>
                    <TableCell>{event.integration_name || <span className="text-muted-foreground">None</span>}</TableCell>
                    <TableCell>
                      <Badge variant={event.is_active ? "default" : "secondary"}>
                        {event.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {environment === "sandbox" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePromote(event.id)}
                            title="Promote to Production"
                          >
                            <ArrowUpCircle className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTest(event)}
                          title="Send Test Email"
                          disabled={!event.template || !event.integration}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => showTriggerCode(event)} title="View Trigger Code">
                          <Code className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(event)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(event.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Update event configuration" : "Define a new event for triggering emails"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Welcome Email" required />
              {!editingEvent && form.name && (
                <p className="text-xs text-muted-foreground">
                  Slug: <code>{form.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}</code>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional description" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={form.template} onValueChange={(v) => update("template", v)}>
                <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SES Integration</Label>
              <Select value={form.integration} onValueChange={(v) => update("integration", v)}>
                <SelectTrigger><SelectValue placeholder="Select an integration" /></SelectTrigger>
                <SelectContent>
                  {integrations.map((i) => (
                    <SelectItem key={i.id} value={i.id.toString()}>{i.name} ({i.sender_email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editingEvent ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Trigger Code Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Trigger Code</DialogTitle>
            <DialogDescription>Use this curl command to trigger the "{selectedEvent?.name}" event</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium">curl</span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(triggerCode);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
            <pre className="overflow-auto px-4 pb-4 text-sm">{triggerCode}</pre>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Event Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Event</DialogTitle>
            <DialogDescription>
              Send a test email for "{testEvent?.name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTestSend} className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="test@example.com"
                required
              />
            </div>
            {Object.keys(testData).length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Placeholder Data</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {Object.keys(testData).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <code className="min-w-[120px] shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">
                        {`{{${key}}}`}
                      </code>
                      <Input
                        value={testData[key]}
                        onChange={(e) =>
                          setTestData((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={`Value for ${key}`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTestDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={testSending}>
                {testSending ? "Sending..." : "Send Test Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
