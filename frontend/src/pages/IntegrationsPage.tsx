import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, Plus, RefreshCw, Trash2, Wifi } from "lucide-react";
import { integrationsApi } from "@/services/integrations";
import type { SESIntegration } from "@/types";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "EU (Ireland)" },
  { value: "eu-west-2", label: "EU (London)" },
  { value: "eu-central-1", label: "EU (Frankfurt)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
];

export default function IntegrationsPage() {
  const { environment } = useEnvironment();
  const [integrations, setIntegrations] = useState<SESIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    aws_access_key: "",
    aws_secret_key: "",
    region: "us-east-1",
    sender_email: "",
  });

  const fetchIntegrations = async () => {
    try {
      const { data } = await integrationsApi.list();
      setIntegrations(data.results);
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [environment]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await integrationsApi.create(form);
      toast.success("Integration created");
      setDialogOpen(false);
      setForm({ name: "", aws_access_key: "", aws_secret_key: "", region: "us-east-1", sender_email: "" });
      fetchIntegrations();
    } catch {
      toast.error("Failed to create integration");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this integration?")) return;
    try {
      await integrationsApi.delete(id);
      toast.success("Integration deleted");
      fetchIntegrations();
    } catch {
      toast.error("Failed to delete integration");
    }
  };

  const handleVerify = async (id: number) => {
    try {
      const { data } = await integrationsApi.verifySender(id);
      toast.success(data.detail);
    } catch {
      toast.error("Failed to send verification");
    }
  };

  const handleCheckVerification = async (id: number) => {
    try {
      const { data } = await integrationsApi.checkVerification(id);
      toast.info(data.is_verified ? "Sender is verified" : "Sender is not yet verified");
      fetchIntegrations();
    } catch {
      toast.error("Failed to check verification");
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      const { data } = await integrationsApi.testConnection(id);
      if (data.success) {
        toast.success(data.detail || "Connection successful!");
        fetchIntegrations(); // Refresh to show updated verified status
      } else {
        toast.error(data.detail || "Connection test failed");
      }
    } catch {
      toast.error("Connection test failed");
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SES Integrations</h2>
          <p className="text-muted-foreground">Manage your AWS SES connections</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Integration
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : integrations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Cloud className="mx-auto mb-2 h-8 w-8" />
              <p>No integrations yet. Add your first SES integration.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Sender Email</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell className="font-medium">{integration.name}</TableCell>
                    <TableCell>{integration.region}</TableCell>
                    <TableCell>{integration.sender_email}</TableCell>
                    <TableCell>
                      <Badge variant={integration.is_verified ? "default" : "secondary"}>
                        {integration.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={integration.is_active ? "default" : "outline"}>
                        {integration.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleTestConnection(integration.id)} title="Test Connection">
                          <Wifi className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleVerify(integration.id)} title="Send Verification">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCheckVerification(integration.id)} title="Check Verification">
                          Check
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(integration.id)} title="Delete">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SES Integration</DialogTitle>
            <DialogDescription>Connect your AWS SES account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="My SES Integration" required />
            </div>
            <div className="space-y-2">
              <Label>AWS Access Key</Label>
              <Input value={form.aws_access_key} onChange={(e) => update("aws_access_key", e.target.value)} placeholder="AKIA..." required />
            </div>
            <div className="space-y-2">
              <Label>AWS Secret Key</Label>
              <Input type="password" value={form.aws_secret_key} onChange={(e) => update("aws_secret_key", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => update("region", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AWS_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sender Email</Label>
              <Input type="email" value={form.sender_email} onChange={(e) => update("sender_email", e.target.value)} placeholder="noreply@example.com" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
