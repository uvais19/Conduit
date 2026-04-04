"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createEmptyBrandManifesto,
  listToText,
  textToList,
} from "@/lib/brand/manifesto";
import type { BrandManifesto } from "@/lib/types";

const sliderFields = [
  {
    key: "formal",
    label: "Formal",
    hint: "Slide toward formal for polished, professional copy; toward playful for casual, conversational language. This axis shapes word choice and structure.",
  },
  {
    key: "playful",
    label: "Playful",
    hint: "Higher values encourage humor, warmth, and light metaphors. Lower values keep the tone more restrained and serious.",
  },
  {
    key: "technical",
    label: "Technical",
    hint: "How much industry jargon, specs, and precision to use versus plain-language explanation.",
  },
  {
    key: "emotional",
    label: "Emotional",
    hint: "Whether copy leans on feelings, empathy, and story versus rational benefits and facts.",
  },
  {
    key: "provocative",
    label: "Provocative",
    hint: "Tolerance for bold takes, contrarian angles, and tension. Lower settings favor safer, consensus-friendly messaging.",
  },
] as const;

const LANGUAGE_HINTS = {
  sentenceLength:
    "Average length and rhythm of sentences. Short = punchy; long = narrative; varied = mixed cadence for interest.",
  vocabulary:
    "Complexity of words: simple for broad reach, professional for B2B polish, technical for expert audiences.",
  perspective:
    'Whether the brand speaks as "we" (first person), about itself in third person, or mixes both.',
  emojiUsage:
    "How often to use emojis in social copy. None keeps feeds corporate; heavy suits consumer lifestyle brands.",
} as const;

const VOICE_GUARDRAIL_HINTS = {
  voiceAttributes:
    "Traits writers should embody — one per line. These sync with your manifesto and directly steer generation.",
  bannedWords:
    "Terms or phrases that must never appear — one per line. Useful for compliance, competitor names, or clichés.",
  contentDos:
    "Encouraged habits for every post — one per line. Reinforces what “good” looks like for your brand.",
  contentDonts:
    "Hard stops and off-limits — one per line. Reduces mistakes before content goes to review.",
} as const;

export function BrandVoiceEditor() {
  const [manifesto, setManifesto] = useState<BrandManifesto>(createEmptyBrandManifesto());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadManifesto() {
      try {
        const response = await fetch("/api/brand");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load brand voice settings");
        }

        if (data.manifesto) {
          setManifesto(createEmptyBrandManifesto(data.manifesto));
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load brand voice settings"
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
        throw new Error(data.error || "Unable to save brand voice");
      }

      setManifesto(createEmptyBrandManifesto(data.manifesto));
      setMessage("Brand voice saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save brand voice");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading your brand voice...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Voice</h1>
          <p className="text-muted-foreground">
            Fine-tune tone, language style, and content guardrails for every platform writer agent.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <SlidersHorizontal className="mr-2 size-4" />
          {saving ? "Saving..." : "Save voice settings"}
        </Button>
      </div>

      {message && <div className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Tone spectrum</CardTitle>
          <CardDescription>
            Use the sliders to show how the brand should sound on a 1–10 scale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sliderFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <FieldLabelWithHint htmlFor={field.key} label={field.label} hint={field.hint} />
                <span className="text-muted-foreground">
                  {manifesto.toneSpectrum[field.key]}/10
                </span>
              </div>
              <input
                id={field.key}
                type="range"
                min={1}
                max={10}
                value={manifesto.toneSpectrum[field.key]}
                onChange={(event) =>
                  setManifesto((current) => ({
                    ...current,
                    toneSpectrum: {
                      ...current.toneSpectrum,
                      [field.key]: Number(event.target.value),
                    },
                  }))
                }
                className="w-full"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language style</CardTitle>
          <CardDescription>
            These settings guide sentence length, vocabulary, perspective, and emoji usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="sentenceLength"
              label="Sentence length"
              hint={LANGUAGE_HINTS.sentenceLength}
            />
            <select
              id="sentenceLength"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.languageStyle.sentenceLength}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  languageStyle: {
                    ...current.languageStyle,
                    sentenceLength: event.target.value as BrandManifesto["languageStyle"]["sentenceLength"],
                  },
                }))
              }
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
              <option value="varied">Varied</option>
            </select>
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="vocabulary"
              label="Vocabulary"
              hint={LANGUAGE_HINTS.vocabulary}
            />
            <select
              id="vocabulary"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.languageStyle.vocabulary}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  languageStyle: {
                    ...current.languageStyle,
                    vocabulary: event.target.value as BrandManifesto["languageStyle"]["vocabulary"],
                  },
                }))
              }
            >
              <option value="simple">Simple</option>
              <option value="professional">Professional</option>
              <option value="technical">Technical</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="perspective"
              label="Perspective"
              hint={LANGUAGE_HINTS.perspective}
            />
            <select
              id="perspective"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.languageStyle.perspective}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  languageStyle: {
                    ...current.languageStyle,
                    perspective: event.target.value as BrandManifesto["languageStyle"]["perspective"],
                  },
                }))
              }
            >
              <option value="first-person">First person</option>
              <option value="third-person">Third person</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="emojiUsage"
              label="Emoji usage"
              hint={LANGUAGE_HINTS.emojiUsage}
            />
            <select
              id="emojiUsage"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={manifesto.languageStyle.emojiUsage}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  languageStyle: {
                    ...current.languageStyle,
                    emojiUsage: event.target.value as BrandManifesto["languageStyle"]["emojiUsage"],
                  },
                }))
              }
            >
              <option value="none">None</option>
              <option value="minimal">Minimal</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice attributes & guardrails</CardTitle>
          <CardDescription>
            This is the part the writer agents read before generating content.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="voiceAttributes"
              label="Voice attributes (one per line)"
              hint={VOICE_GUARDRAIL_HINTS.voiceAttributes}
            />
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
            <FieldLabelWithHint
              htmlFor="bannedWords"
              label="Banned words (one per line)"
              hint={VOICE_GUARDRAIL_HINTS.bannedWords}
            />
            <textarea
              id="bannedWords"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={listToText(manifesto.bannedWords)}
              onChange={(event) =>
                setManifesto((current) => ({
                  ...current,
                  bannedWords: textToList(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabelWithHint
              htmlFor="contentDos"
              label="Content do's"
              hint={VOICE_GUARDRAIL_HINTS.contentDos}
            />
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
            <FieldLabelWithHint
              htmlFor="contentDonts"
              label="Content don'ts"
              hint={VOICE_GUARDRAIL_HINTS.contentDonts}
            />
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
        </CardContent>
      </Card>
    </div>
  );
}
