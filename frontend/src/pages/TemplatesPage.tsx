import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpCircle, Copy, Eye, Mail, Monitor, Moon, Pencil, Plus, Settings, Smartphone, Sun, Tablet, Trash2, Upload } from "lucide-react";
import { templatesApi } from "@/services/templates";
import type { EmailTemplate, Placeholder } from "@/types";
import { useEnvironment } from "@/contexts/EnvironmentContext";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { environment } = useEnvironment();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", subject: "", html_content: "" });
  const [placeholderOpen, setPlaceholderOpen] = useState(false);
  const [placeholderTemplate, setPlaceholderTemplate] = useState<EmailTemplate | null>(null);
  const [editPlaceholders, setEditPlaceholders] = useState<Placeholder[]>([]);
  const [savingPlaceholders, setSavingPlaceholders] = useState(false);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewDark, setPreviewDark] = useState(false);
  const [previewContext, setPreviewContext] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");

  const fetchTemplates = async () => {
    try {
      const { data } = await templatesApi.list();
      setTemplates(data.results);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [environment]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try {
      await templatesApi.delete(id);
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await templatesApi.duplicate(id);
      toast.success("Template duplicated");
      fetchTemplates();
    } catch {
      toast.error("Failed to duplicate template");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await templatesApi.uploadHtml(uploadForm);
      toast.success("Template uploaded");
      setUploadOpen(false);
      setUploadForm({ name: "", subject: "", html_content: "" });
      fetchTemplates();
    } catch {
      toast.error("Failed to upload template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadForm((prev) => ({ ...prev, html_content: content }));
    };
    reader.readAsText(file);
  };

  const openPlaceholders = (template: EmailTemplate) => {
    setPlaceholderTemplate(template);
    setEditPlaceholders(template.placeholders.map((p) => ({ ...p })));
    setPlaceholderOpen(true);
  };

  const handlePromote = async (id: number) => {
    if (!confirm("Promote this template to Production? An existing production version will be overwritten.")) return;
    try {
      await templatesApi.promote(id);
      toast.success("Template promoted to Production");
    } catch {
      toast.error("Failed to promote template");
    }
  };

  const handleSavePlaceholders = async () => {
    if (!placeholderTemplate) return;
    setSavingPlaceholders(true);
    try {
      await templatesApi.updatePlaceholders(placeholderTemplate.id, editPlaceholders);
      toast.success("Placeholder defaults saved");
      setPlaceholderOpen(false);
      fetchTemplates();
    } catch {
      toast.error("Failed to save placeholders");
    } finally {
      setSavingPlaceholders(false);
    }
  };

  const loadPreview = useCallback(async (template: EmailTemplate, context: Record<string, string>) => {
    setPreviewLoading(true);
    // Sanitize context: ensure all values are strings (guard against null/undefined from API)
    const sanitizedContext: Record<string, string> = Object.fromEntries(
      Object.entries(context).map(([k, v]) => [k, v ?? ""])
    );
    try {
      const { data } = await templatesApi.preview(template.id, sanitizedContext);
      setPreviewHtml(data.html);
      setPreviewSubject(data.subject);
    } catch {
      toast.error("Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const openPreview = (template: EmailTemplate) => {
    const initialContext: Record<string, string> = {};
    for (const p of template.placeholders) {
      initialContext[p.name] = p.default_value || "";
    }
    setPreviewTemplate(template);
    setPreviewContext(initialContext);
    setPreviewDark(false);
    setPreviewDevice("desktop");
    setPreviewHtml("");
    setPreviewSubject("");
    setPreviewOpen(true);
    loadPreview(template, initialContext);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Templates</h2>
          <p className="text-muted-foreground">Create and manage email templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload HTML
          </Button>
          <Button onClick={() => navigate("/templates/new")}>
            <Plus className="mr-2 h-4 w-4" /> Create Template
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="mx-auto mb-2 h-8 w-8" />
              <p>No templates yet. Create your first email template.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Placeholders</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{template.subject}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.placeholders.map((p) => (
                          <Badge key={p.name} variant="secondary" className="text-xs" title={p.default_value ? `Default: ${p.default_value}` : undefined}>
                            {`{{${p.name}}}`}
                          </Badge>
                        ))}
                        {template.placeholders.length === 0 && (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(template.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {environment === "sandbox" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePromote(template.id)}
                            title="Promote to Production"
                          >
                            <ArrowUpCircle className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPlaceholders(template)}
                          title="Manage Placeholders"
                          disabled={template.placeholders.length === 0}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreview(template)}
                          title="Preview"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(template.id)}
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/templates/${template.id}/edit`)} title="Edit">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(template.id)} title="Delete">
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

      {/* Manage Placeholders Dialog */}
      <Dialog open={placeholderOpen} onOpenChange={setPlaceholderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Placeholders</DialogTitle>
            <DialogDescription>
              Set default values for placeholders in "{placeholderTemplate?.name}".
              These defaults are used when no value is provided at send time.
            </DialogDescription>
          </DialogHeader>
          {editPlaceholders.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No placeholders detected. Add {"{{variable}}"} to your template content or subject.
            </p>
          ) : (
            <div className="space-y-3">
              {editPlaceholders.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-3">
                  <code className="min-w-[140px] shrink-0 rounded bg-muted px-2 py-1 text-xs font-medium">
                    {`{{${p.name}}}`}
                  </code>
                  <Input
                    value={p.default_value}
                    onChange={(e) =>
                      setEditPlaceholders((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, default_value: e.target.value } : item
                        )
                      )
                    }
                    placeholder="Default value (optional)"
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPlaceholderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlaceholders} disabled={savingPlaceholders}>
              {savingPlaceholders ? "Saving..." : "Save Defaults"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload HTML Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload HTML Template</DialogTitle>
            <DialogDescription>Upload an HTML file or paste HTML content</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 overflow-hidden">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={uploadForm.subject}
                onChange={(e) => setUploadForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Welcome, {{user_name}}!"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>HTML File</Label>
              <Input type="file" accept=".html,.htm" onChange={handleFileUpload} />
            </div>
            <div className="space-y-2 min-h-0">
              <div className="flex items-center justify-between">
                <Label>Or paste HTML</Label>
                {uploadForm.html_content && (
                  <span className="text-xs text-muted-foreground">
                    {uploadForm.html_content.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <Textarea
                value={uploadForm.html_content}
                onChange={(e) => setUploadForm((p) => ({ ...p, html_content: e.target.value }))}
                rows={6}
                className="max-h-[200px] resize-none font-mono text-xs overflow-auto"
                style={{ fieldSizing: "fixed" }}
                placeholder="<html>...</html>"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !uploadForm.html_content}>
                {submitting ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            {previewSubject && (
              <DialogDescription>Subject: {previewSubject}</DialogDescription>
            )}
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 pb-3 border-b shrink-0">
            {/* Device switcher */}
            <div className="flex items-center rounded-md border overflow-hidden">
              {(
                [
                  { key: "mobile", icon: Smartphone, label: "Mobile (375px)" },
                  { key: "tablet", icon: Tablet, label: "Tablet (768px)" },
                  { key: "desktop", icon: Monitor, label: "Desktop" },
                ] as const
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  title={label}
                  onClick={() => setPreviewDevice(key)}
                  className={`flex items-center justify-center px-3 py-1.5 transition-colors ${
                    previewDevice === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Dark mode toggle */}
            <Button
              size="sm"
              variant={previewDark ? "default" : "outline"}
              onClick={() => setPreviewDark((d) => !d)}
              className="gap-1.5"
            >
              {previewDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              {previewDark ? "Dark" : "Light"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => previewTemplate && loadPreview(previewTemplate, previewContext)}
              disabled={previewLoading}
            >
              {previewLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {/* Placeholder context inputs */}
          {previewTemplate && previewTemplate.placeholders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b bg-muted/30 shrink-0">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Preview values:</span>
              {previewTemplate.placeholders.map((p) => (
                <div key={p.name} className="flex items-center gap-1">
                  <code className="text-xs text-muted-foreground">{`{{${p.name}}}`}</code>
                  <Input
                    value={previewContext[p.name] ?? ""}
                    onChange={(e) =>
                      setPreviewContext((prev) => ({ ...prev, [p.name]: e.target.value }))
                    }
                    className="h-7 w-28 text-xs"
                    placeholder={p.default_value || p.name}
                  />
                </div>
              ))}
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => previewTemplate && loadPreview(previewTemplate, previewContext)}
                disabled={previewLoading}
              >
                Apply
              </Button>
            </div>
          )}

          {/* iframe */}
          <div className="flex-1 min-h-0 px-6 pb-6 pt-3 overflow-auto">
            <div
              className="h-full mx-auto rounded border overflow-hidden bg-white transition-all duration-200"
              style={{
                width:
                  previewDevice === "mobile"
                    ? "375px"
                    : previewDevice === "tablet"
                    ? "768px"
                    : "100%",
              }}
            >
              {previewLoading && !previewHtml ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Loading preview...
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="w-full h-full"
                  style={previewDark ? { filter: "invert(1) hue-rotate(180deg)" } : undefined}
                  title="Email preview"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
