"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function BrandManifestoEditor() {
  const [manifesto, setManifesto] = useState<BrandManifesto>(createEmptyBrandManifesto());
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving..." : "Save manifesto"}
        </Button>
      </div>

      {version && (
        <p className="text-sm text-muted-foreground">Current saved version: {version}</p>
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
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={manifesto.businessName}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, businessName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={manifesto.tagline ?? ""}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, tagline: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={manifesto.industry}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, industry: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subIndustry">Sub-industry</Label>
            <Input
              id="subIndustry"
              value={manifesto.subIndustry ?? ""}
              onChange={(event) =>
                setManifesto((current) => ({ ...current, subIndustry: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="missionStatement">Mission statement</Label>
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
            <Label htmlFor="vision">Vision</Label>
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
            <Label htmlFor="demographics">Primary audience demographics</Label>
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
            <Label htmlFor="psychographics">Primary audience psychographics</Label>
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
            <Label htmlFor="painPoints">Pain points (one per line)</Label>
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
            <Label htmlFor="desires">Desires (one per line)</Label>
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
            <Label htmlFor="productsServices">Products / services (format: Name: description)</Label>
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
            <Label htmlFor="uniqueSellingPropositions">Unique selling propositions (one per line)</Label>
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
          <CardDescription>These rules guide every caption, strategy, and asset.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="voiceAttributes">Voice attributes (one per line)</Label>
            <textarea
              id="voiceAttributes"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.voiceAttributes)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  voiceAttributes: textToList(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyMessages">Key messages (one per line)</Label>
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
            <Label htmlFor="contentDos">Content do&apos;s</Label>
            <textarea
              id="contentDos"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.contentDos)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  contentDos: textToList(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contentDonts">Content don&apos;ts</Label>
            <textarea
              id="contentDonts"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.contentDonts)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  contentDonts: textToList(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialMediaGoals">Social media goals (one per line)</Label>
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
            <Label htmlFor="visualStyle">Visual style</Label>
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
