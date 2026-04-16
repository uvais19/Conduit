"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Input } from "@/components/ui/input";
import { AutoAdvanceBanner } from "@/components/auto-advance-banner";
import type { BrandManifesto } from "@/lib/types";

type UploadedDocument = {
  id?: string;
  fileName: string;
  fileType: "pdf" | "docx" | "pptx" | "image";
  fileUrl?: string;
  notes?: string;
  extractedText?: string;
};

type DiscoveryResponse = {
  manifesto: BrandManifesto;
  version: number;
  scraper: {
    source: string;
    summary: string;
    keyPoints: string[];
  };
  documents: {
    summary: string;
    insights: string[];
    documentCount: number;
  };
};

type PrefillSuggestions = {
  industry: string;
  targetAudience: string;
  goals: string;
  offerings: string;
  differentiators: string;
  brandTone: string;
  contentDos: string;
  contentDonts: string;
};

const PREFILL_FIELDS = [
  "industry",
  "targetAudience",
  "goals",
  "offerings",
  "differentiators",
  "brandTone",
  "contentDos",
  "contentDonts",
] as const;

const initialForm = {
  websiteUrl: "",
  businessName: "",
  industry: "",
  targetAudience: "",
  goals: "",
  offerings: "",
  differentiators: "",
  brandTone: "",
  contentDos: "",
  contentDonts: "",
  notes: "",
  documents: [] as UploadedDocument[],
};

const ADVANCE_MS = 5000;

export function OnboardingWizard() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [uploadNotes, setUploadNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<string>>(new Set());

  const canPrefill = form.websiteUrl.trim().length > 0 && form.businessName.trim().length > 0;
  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!result) return;
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      router.refresh();
      router.push("/strategy");
    }, ADVANCE_MS);
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [result, router]);

  function cancelAdvanceTimer() {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (aiSuggestedFields.has(name)) {
      setAiSuggestedFields((current) => {
        const next = new Set(current);
        next.delete(name);
        return next;
      });
    }
  }

  async function handlePrefill() {
    setPrefilling(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: form.websiteUrl,
          businessName: form.businessName,
          industry: form.industry,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to generate suggestions");
      }

      const suggestions = data.suggestions as PrefillSuggestions;
      const filledFields = new Set<string>();

      setForm((current) => {
        const next = { ...current };
        for (const key of PREFILL_FIELDS) {
          const value = suggestions[key];
          if (value?.trim()) {
            next[key] = value.trim();
            filledFields.add(key);
          }
        }
        return next;
      });

      setAiSuggestedFields(filledFields);
    } catch (prefillError) {
      setError(
        prefillError instanceof Error
          ? prefillError.message
          : "Unable to generate suggestions"
      );
    } finally {
      setPrefilling(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setError("");
    setUploading(true);

    try {
      const uploaded: UploadedDocument[] = [];

      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        body.append("notes", uploadNotes);

        const response = await fetch("/api/onboarding/upload", {
          method: "POST",
          body,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        uploaded.push(data.document as UploadedDocument);
      }

      setForm((current) => ({
        ...current,
        documents: [...current.documents, ...uploaded],
      }));
      setUploadNotes("");
      event.target.value = "";
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload documents"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to generate your brand manifesto");
      }

      setResult(data as DiscoveryResponse);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to run the discovery pipeline"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboard Your Business</h1>
          <p className="text-muted-foreground">
            Run the Discovery Pipeline to generate your first AI-built Brand Manifesto.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          Phase 2 • Discovery Pipeline
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Card 1: minimum inputs + AI trigger — all co-located */}
        <Card>
          <CardHeader>
            <CardTitle>1. Getting Started</CardTitle>
            <CardDescription>
              Enter your business name and website — then let AI suggest the rest, or fill in the cards below yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabelWithHint htmlFor="businessName" label="Business name" hint="The official name of your business as it should appear in content and your brand identity." />
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(event) => updateField("businessName", event.target.value)}
                  placeholder="Acme Marketing"
                  required
                />
              </div>
              <div className="space-y-2">
                <FieldLabelWithHint htmlFor="websiteUrl" label="Website URL" hint="Your public website homepage. Conduit's Scraper Agent will crawl it to extract brand language, messaging, products, and tone of voice automatically." />
                <Input
                  id="websiteUrl"
                  value={form.websiteUrl}
                  onChange={(event) => updateField("websiteUrl", event.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
              <Sparkles className="size-5 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Let AI fill in the details</p>
                <p className="text-xs text-muted-foreground">
                  Conduit will scrape your website and suggest your industry, audience, offerings, tone, and content rules.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canPrefill || prefilling}
                onClick={handlePrefill}
                className="shrink-0 gap-1.5"
              >
                <Sparkles className="size-3.5 text-primary" />
                {prefilling ? "Analyzing..." : "Suggest with AI"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: factual business data — what AI infers from the website */}
        <Card>
          <CardHeader>
            <CardTitle>2. Your Business</CardTitle>
            <CardDescription>
              Describe what you do, who you serve, and what sets you apart.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabelWithHint
                htmlFor="industry"
                label="Industry"
                hint="The sector your business operates in — be specific (e.g. B2B SaaS, Independent Retail, Healthcare Consulting). This shapes tone and content strategy."
                aiSuggested={aiSuggestedFields.has("industry")}
              />
              <Input
                id="industry"
                value={form.industry}
                onChange={(event) => updateField("industry", event.target.value)}
                placeholder="B2B SaaS"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabelWithHint htmlFor="differentiators" label="Differentiators / USPs" hint="What makes you different from competitors? Think about your unique methodology, turnaround time, pricing model, expertise, or the specific problem only you solve." aiSuggested={aiSuggestedFields.has("differentiators")} />
              <textarea
                id="differentiators"
                className="min-h-[5.5rem] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.differentiators}
                onChange={(event) => updateField("differentiators", event.target.value)}
                placeholder="What makes you different?"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabelWithHint htmlFor="offerings" label="Products or services" hint="List what you sell or deliver — one item per line. Include key features or pricing tiers if relevant. This helps the AI write accurate, specific content about your offers." aiSuggested={aiSuggestedFields.has("offerings")} />
              <textarea
                id="offerings"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.offerings}
                onChange={(event) => updateField("offerings", event.target.value)}
                placeholder="List your main offers, one per line."
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabelWithHint htmlFor="targetAudience" label="Target audience" hint="Describe your ideal customers — their job titles, demographics, goals, and pain points. The more specific, the better the content will resonate." aiSuggested={aiSuggestedFields.has("targetAudience")} />
              <textarea
                id="targetAudience"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.targetAudience}
                onChange={(event) => updateField("targetAudience", event.target.value)}
                placeholder="Who do you serve? Include demographics, role, and needs."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: opinionated strategy fields — AI suggests, user refines */}
        <Card>
          <CardHeader>
            <CardTitle>3. Content Strategy</CardTitle>
            <CardDescription>
              Define your goals, brand voice, and the rules that will guide every post Conduit writes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <FieldLabelWithHint htmlFor="goals" label="Social media goals" hint="What you want social media to achieve for your business — e.g. brand awareness, lead generation, driving website traffic, thought leadership, or local foot traffic." aiSuggested={aiSuggestedFields.has("goals")} />
              <textarea
                id="goals"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.goals}
                onChange={(event) => updateField("goals", event.target.value)}
                placeholder="Brand awareness, lead generation, thought leadership, local foot traffic..."
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabelWithHint htmlFor="brandTone" label="Brand tone / adjectives" hint="3–6 words that describe how your brand should sound. Examples: confident, approachable, witty, premium, no-nonsense, warm. This directly shapes the writing style of every post." aiSuggested={aiSuggestedFields.has("brandTone")} />
              <textarea
                id="brandTone"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.brandTone}
                onChange={(event) => updateField("brandTone", event.target.value)}
                placeholder="Helpful, confident, witty, premium..."
              />
            </div>
            <div className="space-y-2">
              <FieldLabelWithHint htmlFor="notes" label="Extra notes" hint="Anything else worth knowing — competitor names to be aware of, market positioning, customer pain points, pricing philosophy, or seasonal context. Treat this as a brain dump." />
              <textarea
                id="notes"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Any other context, customer pains, market positioning..."
              />
            </div>
            <div className="space-y-2">
              <FieldLabelWithHint htmlFor="contentDos" label="Content do's" hint="Approaches, formats, or topics you want the AI to actively use — e.g. 'use customer success stories', 'always cite a stat', 'ask a question at the end', 'include a clear CTA'." aiSuggested={aiSuggestedFields.has("contentDos")} />
              <textarea
                id="contentDos"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.contentDos}
                onChange={(event) => updateField("contentDos", event.target.value)}
                placeholder="Use customer stories, cite data, stay practical..."
              />
            </div>
            <div className="space-y-2">
              <FieldLabelWithHint htmlFor="contentDonts" label="Content don'ts" hint="Hard rules for the AI to follow — topics to avoid, phrases that feel off-brand, or styles that don't fit. E.g. 'no jargon', 'don't mention competitors by name', 'never use clickbait'." aiSuggested={aiSuggestedFields.has("contentDonts")} />
              <textarea
                id="contentDonts"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.contentDonts}
                onChange={(event) => updateField("contentDonts", event.target.value)}
                placeholder="Avoid jargon, don&apos;t be too salesy, no clickbait..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Supporting Documents</CardTitle>
            <CardDescription>
              Upload brand guidelines, decks, PDFs, or visual references to strengthen the analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FieldLabelWithHint htmlFor="uploadNotes" label="Notes for uploaded files" hint="Tell the Document Analyst what these files are and how to use them — e.g. 'this is our brand guidelines deck', 'this PDF has our target customer research', 'these are old ad scripts for tone reference'." />
              <textarea
                id="uploadNotes"
                className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={uploadNotes}
                onChange={(event) => setUploadNotes(event.target.value)}
                placeholder="Add context about the files you&apos;re uploading..."
              />
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input type="file" multiple onChange={handleUpload} />
              <Button type="button" variant="outline" disabled={uploading}>
                <Upload className="mr-2 size-4" />
                {uploading ? "Uploading..." : "Upload to discovery"}
              </Button>
            </div>

            {form.documents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.documents.map((document, index) => (
                  <Badge key={`${document.fileName}-${index}`} variant="outline">
                    {document.fileName} • {document.fileType}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={submitting}>
            <Wand2 className="mr-2 size-4" />
            {submitting ? "Running agents..." : "Generate Brand Manifesto"}
          </Button>
          <Link
            href="/brand"
            className={buttonVariants({ variant: "outline" })}
          >
            Open current manifesto
          </Link>
        </div>
      </form>

      {result && (
        <>
          <AutoAdvanceBanner
            destination="/strategy"
            label="Content Strategy"
            delayMs={ADVANCE_MS}
            onCancel={cancelAdvanceTimer}
          />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Manifesto generated successfully
              </CardTitle>
              <CardDescription>
                Version {result.version} saved. Next: generate your content strategy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">Identity</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong>{result.manifesto.businessName}</strong> • {result.manifesto.industry}
                  </p>
                  <p className="mt-2 text-sm">{result.manifesto.missionStatement}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">Voice attributes</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.manifesto.voiceAttributes.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Key messages</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {result.manifesto.keyMessages.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">Discovery notes</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Scraper source: {result.scraper.source}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.documents.summary}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/strategy"
                  className={buttonVariants()}
                  onClick={() => {
                    cancelAdvanceTimer();
                    router.refresh();
                  }}
                >
                  Continue to content strategy
                </Link>
                <Link href="/brand" className={buttonVariants({ variant: "outline" })}>
                  Review manifesto
                </Link>
                <Link
                  href="/brand/voice"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Tune brand voice
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
