"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import { Plus, Trash2, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Template = {
  id: string;
  name: string;
  platform: string;
  pillar: string;
  topic: string;
  objective: string;
  audience: string;
  voice: string;
  cta: string;
  usageCount: number;
  createdAt: string;
};

export default function ContentTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    platform: "instagram" as (typeof PLATFORMS)[number],
    pillar: "",
    topic: "",
    objective: "",
    audience: "",
    voice: "",
    cta: "",
  });

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/content/templates");
      const data = await res.json();
      if (res.ok) setTemplates(data.templates ?? []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/content/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create template");
      toast.success("Template created");
      setShowForm(false);
      setForm({ name: "", platform: "instagram", pillar: "", topic: "", objective: "", audience: "", voice: "", cta: "" });
      await loadTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/content/templates?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Template deleted");
      await loadTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  }

  function useTemplate(template: Template) {
    const params = new URLSearchParams({
      platform: template.platform,
      pillar: template.pillar,
      topic: template.topic,
    });
    window.location.href = `/content/generate?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Templates</h1>
          <p className="text-muted-foreground">
            Save and reuse content generation presets to speed up your workflow.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 size-4" />
          New Template
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Template Name</label>
                <Input
                  placeholder="e.g. Weekly LinkedIn Thought Leadership"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Platform</label>
                <select
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as (typeof PLATFORMS)[number] }))}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Pillar</label>
                <Input
                  placeholder="Thought Leadership"
                  value={form.pillar}
                  onChange={(e) => setForm((f) => ({ ...f, pillar: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Topic</label>
                <Input
                  placeholder="Content repurposing strategies"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Objective</label>
                <Input
                  placeholder="engagement"
                  value={form.objective}
                  onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Target Audience</label>
                <Input
                  placeholder="Marketing managers"
                  value={form.audience}
                  onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Voice / Tone</label>
                <Input
                  placeholder="professional, insightful"
                  value={form.voice}
                  onChange={(e) => setForm((f) => ({ ...f, voice: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">CTA</label>
                <Input
                  placeholder="Comment below with your take"
                  value={form.cta}
                  onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Saving..." : "Save Template"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No templates yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a template to save your favorite content generation presets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="group relative">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="truncate">{tpl.name}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {PLATFORM_LABELS[tpl.platform as keyof typeof PLATFORM_LABELS] ?? tpl.platform}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {tpl.pillar && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Pillar:</span> {tpl.pillar}
                  </p>
                )}
                {tpl.topic && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Topic:</span> {tpl.topic}
                  </p>
                )}
                {tpl.objective && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Objective:</span> {tpl.objective}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Used {tpl.usageCount} times
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => useTemplate(tpl)}>
                    <Copy className="mr-1.5 size-3" />
                    Use
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDelete(tpl.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
