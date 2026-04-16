"use client";

import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createEmptyBrandManifesto,
  listToText,
  textToList,
} from "@/lib/brand/manifesto";
import type { BrandManifesto } from "@/lib/types";

function productsToText(manifesto: BrandManifesto): string {
  return manifesto.productsServices
    .map((item) => `${item.name}: ${item.description}`)
    .join("\n");
}

function productsFromText(value: string, audience: string) {
  const lines = textToList(value);
  return lines.map((line) => {
    const [name, ...rest] = line.split(":");
    return {
      name: name.trim() || "Offer",
      description: rest.join(":").trim() || "Describe this offering.",
      targetAudience: audience || undefined,
    };
  });
}

type DeleteConfirm = "idle" | "prompt" | "deleting";

const MANIFESTO_HINTS = {
  businessName:
    "The name writers and strategists should use in captions, bios, and campaigns. Keep it consistent with how customers know you.",
  tagline:
    "A short phrase that captures your value proposition. Often appears under your logo or in the first line of bios.",
  industry:
    "The broad market you operate in (e.g. software, hospitality, professional services). Helps AI pick relevant examples and language.",
  subIndustry:
    "Your niche or specialization within the industry. More specific = more tailored content angles.",
  missionStatement:
    "Why your organization exists and who it serves today. Grounds messaging in purpose, not just products.",
  vision:
    "Where you are headed long term. Useful for aspirational posts and leadership or brand-story content.",
  demographics:
    "Factual traits of your primary audience: age ranges, locations, roles, company size, or segments. One clear paragraph or bullet-style text is fine.",
  psychographics:
    "How your audience thinks and feels: values, motivations, objections, and lifestyle. Complements demographics for tone and hooks.",
  painPoints:
    "Problems or frustrations your audience faces — one per line. Content can speak directly to these pains.",
  desires:
    "Outcomes or feelings your audience wants — one per line. Pairs with pain points for before/after storytelling.",
  productsServices:
    "What you sell or deliver. Use one line per offer as Name: short description so AI can reference real offerings accurately.",
  uniqueSellingPropositions:
    "Claims that set you apart from alternatives — one per line. Feeds differentiation in hooks and CTAs.",
  voiceAttributes:
    "Adjectives or short phrases that describe how the brand should sound (e.g. direct, warm, expert). Writers use this as a tone checklist.",
  keyMessages:
    "Themes or proof points you want repeated across channels — one per line. Keeps campaigns aligned.",
  contentDos:
    "Behaviors, formats, or topics to lean into — one per line. Examples: cite data, use customer quotes, end with a question.",
  contentDonts:
    "Topics, phrases, or styles to avoid — one per line. Reduces off-brand or risky output.",
  socialMediaGoals:
    "What social should achieve for the business — one per line. Examples: leads, community, employer brand, launches.",
  visualStyle:
    "Direction for imagery and design: colors, mood, photography vs illustration, level of polish. Helps briefs stay on-brand.",
} as const;

export function BrandManifestoEditor() {
  const [manifesto, setManifesto] = useState<BrandManifesto>(createEmptyBrandManifesto());
  const [version, setVersion] = useState<number | null>(null);
  const [versionCount, setVersionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>("idle");
  const isDeleting = deleteConfirm === "deleting";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadManifesto() {
      try {
        const response = await fetch("/api/brand");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load brand manifesto");
        }

        if (data.manifesto) {
          setManifesto(createEmptyBrandManifesto(data.manifesto));
          setVersion(data.version);
        }
        setVersionCount(data.versionCount ?? 0);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load brand manifesto"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadManifesto();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/brand", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(manifesto),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save manifesto");
      }

      setManifesto(createEmptyBrandManifesto(data.manifesto));
      setVersion(data.version);
      setMessage(`Saved successfully as version ${data.version}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save manifesto");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(scope: "current" | "all") {
    setDeleteConfirm("deleting");
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/brand?scope=${scope}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete manifesto");
      }

      if (scope === "all") {
        setManifesto(createEmptyBrandManifesto());
        setVersion(null);
        setVersionCount(0);
        setMessage("All versions deleted. Go to onboarding to recreate your manifesto.");
      } else {
        // Reload to get the previous version (if any)
        const reload = await fetch("/api/brand");
        const reloadData = await reload.json();
        if (reloadData.manifesto) {
          setManifesto(createEmptyBrandManifesto(reloadData.manifesto));
          setVersion(reloadData.version);
          setVersionCount(reloadData.versionCount ?? 0);
          setMessage(`Version deleted. Now on version ${reloadData.version}.`);
        } else {
          setManifesto(createEmptyBrandManifesto());
          setVersion(null);
          setVersionCount(0);
          setMessage("Manifesto deleted. Go to onboarding to recreate it.");
        }
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete manifesto");
    } finally {
      setDeleteConfirm("idle");
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading your manifesto...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Manifesto</h1>
          <p className="text-muted-foreground">
            Review and refine the AI-generated identity for your business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {version && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteConfirm("prompt");
                setMessage("");
                setError("");
              }}
              disabled={isDeleting || saving}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete manifesto
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || isDeleting}>
            <Save className="mr-2 size-4" />
            {saving ? "Saving..." : "Save manifesto"}
          </Button>
        </div>
      </div>

      {version && (
        <p className="text-sm text-muted-foreground">Current saved version: {version}</p>
      )}

      {deleteConfirm === "prompt" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          {versionCount > 1 ? (
            <>
              <p className="text-sm font-medium text-destructive">
                You have {versionCount} saved versions. What would you like to delete?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete("current")}
                  disabled={isDeleting}
                >
                  Delete version {version} only
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete("all")}
                  disabled={isDeleting}
                >
                  Delete all {versionCount} versions
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirm("idle")}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-destructive">
                Are you sure you want to delete your brand manifesto? This cannot be undone.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete("all")}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Yes, delete it"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirm("idle")}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {message && <div className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>The core business details used by every agent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="businessName"
              label="Business name"
              hint={MANIFESTO_HINTS.businessName}
            />
            <Input
              id="businessName"
              value={manifesto.businessName}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, businessName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint htmlFor="tagline" label="Tagline" hint={MANIFESTO_HINTS.tagline} />
            <Input
              id="tagline"
              value={manifesto.tagline ?? ""}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, tagline: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint htmlFor="industry" label="Industry" hint={MANIFESTO_HINTS.industry} />
            <Input
              id="industry"
              value={manifesto.industry}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, industry: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="subIndustry"
              label="Sub-industry"
              hint={MANIFESTO_HINTS.subIndustry}
            />
            <Input
              id="subIndustry"
              value={manifesto.subIndustry ?? ""}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, subIndustry: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabelWithHint
              htmlFor="missionStatement"
              label="Mission statement"
              hint={MANIFESTO_HINTS.missionStatement}
            />
            <textarea
              id="missionStatement"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.missionStatement ?? ""}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, missionStatement: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabelWithHint htmlFor="vision" label="Vision" hint={MANIFESTO_HINTS.vision} />
            <textarea
              id="vision"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.vision ?? ""}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, vision: event.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audience & Offers</CardTitle>
          <CardDescription>Define who you serve and what you provide.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <FieldLabelWithHint
              htmlFor="demographics"
              label="Primary audience demographics"
              hint={MANIFESTO_HINTS.demographics}
            />
            <textarea
              id="demographics"
              className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.primaryAudience.demographics}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  primaryAudience: {
                    ...current.primaryAudience,
                    demographics: event.target.value,
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabelWithHint
              htmlFor="psychographics"
              label="Primary audience psychographics"
              hint={MANIFESTO_HINTS.psychographics}
            />
            <textarea
              id="psychographics"
              className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.primaryAudience.psychographics}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  primaryAudience: {
                    ...current.primaryAudience,
                    psychographics: event.target.value,
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="painPoints"
              label="Pain points (one per line)"
              hint={MANIFESTO_HINTS.painPoints}
            />
            <textarea
              id="painPoints"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.primaryAudience.painPoints)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  primaryAudience: {
                    ...current.primaryAudience,
                    painPoints: textToList(event.target.value),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="desires"
              label="Desires (one per line)"
              hint={MANIFESTO_HINTS.desires}
            />
            <textarea
              id="desires"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.primaryAudience.desires)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  primaryAudience: {
                    ...current.primaryAudience,
                    desires: textToList(event.target.value),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabelWithHint
              htmlFor="productsServices"
              label="Products / services (format: Name: description)"
              hint={MANIFESTO_HINTS.productsServices}
            />
            <textarea
              id="productsServices"
              className="min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={productsToText(manifesto)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  productsServices: productsFromText(
                    event.target.value,
                    current.primaryAudience.demographics
                  ),
                }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabelWithHint
              htmlFor="uniqueSellingPropositions"
              label="Unique selling propositions (one per line)"
              hint={MANIFESTO_HINTS.uniqueSellingPropositions}
            />
            <textarea
              id="uniqueSellingPropositions"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.uniqueSellingPropositions)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  uniqueSellingPropositions: textToList(event.target.value),
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice & Guardrails</CardTitle>
          <CardDescription>
            These rules guide every caption, strategy, and asset. Canonical edits now live in the Brand Voice screen to keep one source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="voiceAttributes"
              label="Voice attributes (one per line)"
              hint={MANIFESTO_HINTS.voiceAttributes}
            />
            <textarea
              id="voiceAttributes"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.voiceAttributes)}
              disabled
              readOnly
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="keyMessages"
              label="Key messages (one per line)"
              hint={MANIFESTO_HINTS.keyMessages}
            />
            <textarea
              id="keyMessages"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.keyMessages)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  keyMessages: textToList(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="contentDos"
              label="Content do's"
              hint={MANIFESTO_HINTS.contentDos}
            />
            <textarea
              id="contentDos"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.contentDos)}
              disabled
              readOnly
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="contentDonts"
              label="Content don'ts"
              hint={MANIFESTO_HINTS.contentDonts}
            />
            <textarea
              id="contentDonts"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.contentDonts)}
              disabled
              readOnly
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="socialMediaGoals"
              label="Social media goals (one per line)"
              hint={MANIFESTO_HINTS.socialMediaGoals}
            />
            <textarea
              id="socialMediaGoals"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.socialMediaGoals)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  socialMediaGoals: textToList(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="visualStyle"
              label="Visual style"
              hint={MANIFESTO_HINTS.visualStyle}
            />
            <textarea
              id="visualStyle"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.visualStyle ?? ""}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, visualStyle: event.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
