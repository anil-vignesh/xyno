import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Blocks, Eye, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { brandComponentsApi } from "@/services/brandComponents";
import { mediaApi } from "@/services/media";
import type { BrandComponent } from "@/types";
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

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "header", label: "Headers" },
  { value: "footer", label: "Footers" },
  { value: "content", label: "Content" },
  { value: "logo", label: "Logos" },
  { value: "other", label: "Other" },
];

const CATEGORY_OPTIONS = [
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "content", label: "Content Block" },
  { value: "logo", label: "Logo / Image" },
  { value: "other", label: "Other" },
];

export default function BrandComponentsPage() {
  const [components, setComponents] = useState<BrandComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    category: "other",
    html_content: "",
    thumbnail_url: "",
  });

  const fetchComponents = async () => {
    try {
      const { data } = await brandComponentsApi.list(activeCategory || undefined);
      setComponents(data.results);
    } catch {
      toast.error("Failed to load components");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchComponents();
  }, [activeCategory]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", category: "other", html_content: "", thumbnail_url: "" });
    setDialogOpen(true);
  };

  const openEdit = async (component: BrandComponent) => {
    try {
      // Fetch full component (list doesn't include html_content)
      const { data } = await brandComponentsApi.get(component.id);
      setEditingId(data.id);
      setForm({
        name: data.name,
        category: data.category,
        html_content: data.html_content,
        thumbnail_url: data.thumbnail_url || "",
      });
      setDialogOpen(true);
    } catch {
      toast.error("Failed to load component");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await brandComponentsApi.update(editingId, form);
        toast.success("Component updated");
      } else {
        await brandComponentsApi.create(form);
        toast.success("Component created");
      }
      setDialogOpen(false);
      fetchComponents();
    } catch {
      toast.error("Failed to save component");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this component?")) return;
    try {
      await brandComponentsApi.delete(id);
      toast.success("Component deleted");
      fetchComponents();
    } catch {
      toast.error("Failed to delete component");
    }
  };

  const handlePreview = async (id: number) => {
    try {
      const { data } = await brandComponentsApi.get(id);
      setPreviewHtml(data.html_content);
      setPreviewOpen(true);
    } catch {
      toast.error("Failed to load component");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setForm((prev) => ({ ...prev, html_content: content }));
    };
    reader.readAsText(file);
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    try {
      const url = await mediaApi.upload(file);
      update("thumbnail_url", url);
      toast.success("Thumbnail uploaded");
    } catch {
      toast.error("Failed to upload thumbnail");
    } finally {
      setThumbnailUploading(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brand Components</h2>
          <p className="text-muted-foreground">
            Reusable email building blocks — headers, footers, logos, and more
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Component
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            size="sm"
            variant={activeCategory === cat.value ? "default" : "outline"}
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : components.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Blocks className="mx-auto mb-2 h-8 w-8" />
              <p>No components yet. Add your first brand component.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{component.category_display}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(component.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(component.id)}
                          title="Preview"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(component)}
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(component.id)}
                          title="Delete"
                        >
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Component" : "Add Component"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update this brand component"
                : "Create a reusable email building block"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Company Footer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>HTML File</Label>
              <Input type="file" accept=".html,.htm" onChange={handleFileUpload} />
            </div>
            <div className="space-y-2 min-h-0">
              <div className="flex items-center justify-between">
                <Label>HTML Content</Label>
                {form.html_content && (
                  <span className="text-xs text-muted-foreground">
                    {form.html_content.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <Textarea
                value={form.html_content}
                onChange={(e) => update("html_content", e.target.value)}
                rows={8}
                className="max-h-[200px] resize-none font-mono text-xs overflow-auto"
                style={{ fieldSizing: "fixed" } as React.CSSProperties}
                placeholder="<div>Your component HTML...</div>"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Thumbnail (optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={thumbnailUploading}
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  {thumbnailUploading ? "Uploading..." : "Upload Image"}
                </Button>
                {form.thumbnail_url && (
                  <img
                    src={form.thumbnail_url}
                    alt="Thumbnail preview"
                    className="h-8 w-8 rounded object-cover border"
                  />
                )}
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleThumbnailUpload}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Component Preview</DialogTitle>
            <DialogDescription>Preview of the HTML component</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-white">
            <iframe
              srcDoc={previewHtml}
              sandbox=""
              className="w-full h-[400px] rounded-lg"
              title="Component Preview"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
