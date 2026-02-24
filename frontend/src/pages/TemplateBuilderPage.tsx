import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import grapesjs, { type Editor } from "grapesjs";
import GjsEditor from "@grapesjs/react";
import newsletterPlugin from "grapesjs-preset-newsletter";
import "grapesjs/dist/css/grapes.min.css";
import juice from "juice";
import { templatesApi } from "@/services/templates";
import { brandComponentsApi } from "@/services/brandComponents";
import { mediaApi } from "@/services/media";
import type { BrandComponent, Placeholder } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Blocks, Info, Plus, Save, X } from "lucide-react";

/** Detect whether a design_json blob is legacy Unlayer format */
function isUnlayerDesign(json: Record<string, unknown>): boolean {
  return !!json.body && !!json.counters;
}

export default function TemplateBuilderPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const designLoadedRef = useRef(false);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [newPlaceholderName, setNewPlaceholderName] = useState("");
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [isImportedHtml, setIsImportedHtml] = useState(false);
  const [showBrandLibrary, setShowBrandLibrary] = useState(false);
  const [brandComponents, setBrandComponents] = useState<BrandComponent[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandCategory, setBrandCategory] = useState("");

  // Load template metadata (name, subject, placeholders) on mount
  useEffect(() => {
    if (isEditing) {
      templatesApi.get(id!).then(({ data }) => {
        setTemplateName(data.name);
        setTemplateSubject(data.subject);
        setPlaceholders(data.placeholders || []);
        if (!data.design_json && data.html_content) {
          setIsImportedHtml(true);
        }
        // Flag legacy Unlayer templates
        if (data.design_json && isUnlayerDesign(data.design_json as Record<string, unknown>)) {
          setIsImportedHtml(true);
        }
      });
    }
  }, [id, isEditing]);

  // Called when GrapeJS editor is ready
  const onEditorReady = (editorInstance: Editor) => {
    setEditor(editorInstance);
    setEditorReady(true);

    if (isEditing && !designLoadedRef.current) {
      templatesApi.get(id!).then(({ data }) => {
        designLoadedRef.current = true;

        if (data.design_json) {
          const designJson = data.design_json as Record<string, unknown>;
          if (isUnlayerDesign(designJson)) {
            // Legacy Unlayer design — cannot load natively, fall back to HTML
            if (data.html_content) {
              editorInstance.setComponents(data.html_content);
            }
          } else {
            // GrapeJS project data — load natively
            editorInstance.loadProjectData(designJson);
          }
        } else if (data.html_content) {
          // Uploaded HTML with no design — load directly
          editorInstance.setComponents(data.html_content);
        }
      });
    }
  };

  // Brand component categories for the library panel
  const brandCategories = [
    { value: "", label: "All" },
    { value: "header", label: "Headers" },
    { value: "footer", label: "Footers" },
    { value: "content", label: "Content" },
    { value: "logo", label: "Logos" },
    { value: "other", label: "Other" },
  ];

  // Fetch brand components when library panel opens or category changes
  useEffect(() => {
    if (showBrandLibrary) {
      setBrandLoading(true);
      brandComponentsApi
        .list(brandCategory || undefined)
        .then(({ data }) => setBrandComponents(data.results))
        .catch(() => toast.error("Failed to load brand components"))
        .finally(() => setBrandLoading(false));
    }
  }, [showBrandLibrary, brandCategory]);

  // Insert a brand component's HTML into the editor
  const insertBrandComponent = async (componentId: number) => {
    try {
      const { data } = await brandComponentsApi.get(componentId);
      if (!editor) return;
      editor.addComponents(data.html_content);
      toast.success(`"${data.name}" inserted`);
    } catch {
      toast.error("Failed to insert component");
    }
  };

  const addPlaceholder = () => {
    const name = newPlaceholderName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!name) return;
    if (placeholders.some((p) => p.name === name)) {
      toast.error(`Placeholder "${name}" already exists`);
      return;
    }
    setPlaceholders((prev) => [...prev, { name, default_value: "" }]);
    setNewPlaceholderName("");
  };

  const removePlaceholder = (name: string) => {
    setPlaceholders((prev) => prev.filter((p) => p.name !== name));
  };

  const updateDefault = (name: string, value: string) => {
    setPlaceholders((prev) =>
      prev.map((p) => (p.name === name ? { ...p, default_value: value } : p))
    );
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!templateSubject.trim()) {
      toast.error("Subject line is required");
      return;
    }
    if (!editor) return;

    setSaving(true);

    const html = editor.getHtml();
    const css = editor.getCss();

    // GrapeJS getHtml() may return content that already contains <body>/<html> tags
    // (e.g. imported HTML templates). Avoid double-wrapping.
    let rawHtml: string;
    if (html.includes("<body") || html.includes("<html")) {
      // Already a full document — just inject CSS into the <head> or before </head>
      if (html.includes("</head>")) {
        rawHtml = html.replace("</head>", `<style>${css}</style></head>`);
      } else if (html.includes("<body")) {
        rawHtml = html.replace(/<body/, `<head><style>${css}</style></head><body`);
      } else {
        rawHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
      }
    } else {
      rawHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
    }

    // Inline CSS into style attributes so email clients (Gmail etc.) render correctly
    const fullHtml = juice(rawHtml) as string;
    const projectData = editor.getProjectData();

    const payload = {
      name: templateName,
      subject: templateSubject,
      html_content: fullHtml,
      design_json: projectData as Record<string, unknown>,
    };

    const promise = isEditing
      ? templatesApi.update(id!, payload)
      : templatesApi.create(payload);

    promise
      .then((res) => {
        if (placeholders.length > 0) {
          return templatesApi.updatePlaceholders(res.data.id, placeholders);
        }
      })
      .then(() => {
        toast.success(isEditing ? "Template updated" : "Template created");
        navigate("/templates");
      })
      .catch(() => {
        toast.error("Failed to save template");
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/templates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-end gap-4">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Template Name</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Welcome Email"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Subject Line</Label>
            <Input
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              placeholder="e.g. Welcome, {{user_name}}!"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowPlaceholders(!showPlaceholders);
              if (!showPlaceholders) setShowBrandLibrary(false);
            }}
            className={showPlaceholders ? "border-primary" : ""}
          >
            Placeholders
            {placeholders.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
                {placeholders.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowBrandLibrary(!showBrandLibrary);
              if (!showBrandLibrary) setShowPlaceholders(false);
            }}
            className={showBrandLibrary ? "border-primary" : ""}
          >
            <Blocks className="mr-2 h-4 w-4" />
            Brand Library
          </Button>
          <Button onClick={handleSave} disabled={saving || !editorReady}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Imported / legacy HTML info banner */}
      {isImportedHtml && (
        <div className="flex items-center gap-2 border-b bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            This template was loaded from HTML. You can edit it visually or add more blocks around it.
            Once saved, it will be stored in the new editor format.
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Editor */}
        <div className="flex-1 min-h-0">
          <GjsEditor
            grapesjs={grapesjs}
            onReady={onEditorReady}
            plugins={[newsletterPlugin]}
            options={{
              height: "100%",
              storageManager: false,
              pluginsOpts: {
                [newsletterPlugin as unknown as string]: {
                  inlineCss: true,
                },
              },
              assetManager: {
                uploadFile: async (e: DragEvent | Event) => {
                  const input = e as Event & { dataTransfer?: DataTransfer; target?: HTMLInputElement };
                  const files = input.dataTransfer?.files ?? (input.target as HTMLInputElement)?.files;
                  if (!files?.length || !editor) return;
                  const uploads = Array.from(files).map(async (file) => {
                    try {
                      const url = await mediaApi.upload(file);
                      editor.AssetManager.add({ src: url, type: 'image' });
                    } catch {
                      toast.error(`Failed to upload ${file.name}`);
                    }
                  });
                  await Promise.all(uploads);
                },
              },
            }}
          />
        </div>

        {/* Placeholders side panel */}
        {showPlaceholders && (
          <div className="w-[300px] shrink-0 border-l bg-muted/30 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Placeholders</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Add variables to use in your template. Use {"{{name}}"} syntax in the editor.
                </p>
              </div>

              {/* Add new placeholder */}
              <div className="flex gap-2">
                <Input
                  value={newPlaceholderName}
                  onChange={(e) => setNewPlaceholderName(e.target.value)}
                  placeholder="variable_name"
                  className="h-8 text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && addPlaceholder()}
                />
                <Button size="sm" variant="outline" onClick={addPlaceholder} className="shrink-0 h-8">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Placeholder list */}
              {placeholders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No placeholders yet. Add one above or use {"{{variable}}"} in your template content — they'll be auto-detected on save.
                </p>
              ) : (
                <div className="space-y-3">
                  {placeholders.map((p) => (
                    <div key={p.name} className="rounded-lg border bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-medium">{`{{${p.name}}}`}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          onClick={() => removePlaceholder(p.name)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={p.default_value}
                        onChange={(e) => updateDefault(p.name, e.target.value)}
                        placeholder="Default value"
                        className="h-7 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Placeholders found in your template content and subject line are auto-detected when you save. You can also add custom ones above.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Brand Library side panel */}
        {showBrandLibrary && (
          <div className="w-[320px] shrink-0 border-l bg-muted/30 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Brand Components</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Insert" to add a component to your template.
                </p>
              </div>

              {/* Category filter */}
              <div className="flex flex-wrap gap-1">
                {brandCategories.map((cat) => (
                  <Button
                    key={cat.value}
                    size="sm"
                    variant={brandCategory === cat.value ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setBrandCategory(cat.value)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Component cards */}
              {brandLoading ? (
                <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
              ) : brandComponents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No components found. Create some in the Brand Components page.
                </p>
              ) : (
                <div className="space-y-2">
                  {brandComponents.map((comp) => (
                    <div key={comp.id} className="rounded-lg border bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{comp.name}</p>
                          <Badge variant="secondary" className="text-[10px] mt-0.5">
                            {comp.category_display}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0 ml-2"
                          onClick={() => insertBrandComponent(comp.id)}
                        >
                          Insert
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Components are inserted as HTML blocks. You can drag them to reorder or add more blocks around them.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
