"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, Sparkles, Upload, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BrandManifesto } from "@/lib/types";

function FieldLabel({
  htmlFor,
  label,
  hint,
}: {
  htmlFor: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip>
        <TooltipTrigger type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <Info className="size-3.5" />
          <span className="sr-only">More info about {label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          {hint}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

type UploadedDocument = {
  id?: string;
  fileName: string;
  fileType: "pdf" | "docx" | "image";
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

export function OnboardingWizard() {
  const [form, setForm] = useState(initialForm);
  const [uploadNotes, setUploadNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoveryResponse | null>(null);

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
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
        <Card>
          <CardHeader>
            <CardTitle>1. Business Basics</CardTitle>
            <CardDescription>
              Give Conduit the minimum context it needs to understand your brand.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="businessName" label="Business name" hint="The official name of your business as it should appear in content and your brand identity." />
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(event) => updateField("businessName", event.target.value)}
                placeholder="Acme Marketing"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="industry" label="Industry" hint="The sector your business operates in — be specific (e.g. B2B SaaS, Independent Retail, Healthcare Consulting). This shapes tone and content strategy." />
              <Input
                id="industry"
                value={form.industry}
                onChange={(event) => updateField("industry", event.target.value)}
                placeholder="B2B SaaS"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="targetAudience" label="Target audience" hint="Describe your ideal customers — their job titles, demographics, goals, and pain points. The more specific, the better the content will resonate." />
              <textarea
                id="targetAudience"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.targetAudience}
                onChange={(event) => updateField("targetAudience", event.target.value)}
                placeholder="Who do you serve? Include demographics, role, and needs."
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="goals" label="Social media goals" hint="What you want social media to achieve for your business — e.g. brand awareness, lead generation, driving website traffic, thought leadership, or local foot traffic." />
              <textarea
                id="goals"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.goals}
                onChange={(event) => updateField("goals", event.target.value)}
                placeholder="Brand awareness, lead generation, thought leadership, local foot traffic..."
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Discovery Inputs</CardTitle>
            <CardDescription>
              Add a website and some manual notes so the agents can synthesize your identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="websiteUrl" label="Website URL" hint="Your public website homepage. Conduit's Scraper Agent will crawl it to extract brand language, messaging, products, and tone of voice automatically." />
              <Input
                id="websiteUrl"
                value={form.websiteUrl}
                onChange={(event) => updateField("websiteUrl", event.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="offerings" label="Products or services" hint="List what you sell or deliver — one item per line. Include key features or pricing tiers if relevant. This helps the AI write accurate, specific content about your offers." />
              <textarea
                id="offerings"
                className="min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.offerings}
                onChange={(event) => updateField("offerings", event.target.value)}
                placeholder="List your main offers, one per line."
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="differentiators" label="Differentiators / USPs" hint="What makes you different from competitors? Think about your unique methodology, turnaround time, pricing model, expertise, or the specific problem only you solve." />
              <textarea
                id="differentiators"
                className="min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.differentiators}
                onChange={(event) => updateField("differentiators", event.target.value)}
                placeholder="What makes you different?"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="brandTone" label="Brand tone / adjectives" hint="3–6 words that describe how your brand should sound. Examples: confident, approachable, witty, premium, no-nonsense, warm. This directly shapes the writing style of every post." />
              <textarea
                id="brandTone"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.brandTone}
                onChange={(event) => updateField("brandTone", event.target.value)}
                placeholder="Helpful, confident, witty, premium..."
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="notes" label="Extra notes" hint="Anything else worth knowing — competitor names to be aware of, market positioning, customer pain points, pricing philosophy, or seasonal context. Treat this as a brain dump." />
              <textarea
                id="notes"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Any other context, customer pains, market positioning..."
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="contentDos" label="Content do's" hint="Approaches, formats, or topics you want the AI to actively use — e.g. 'use customer success stories', 'always cite a stat', 'ask a question at the end', 'include a clear CTA'." />
              <textarea
                id="contentDos"
                className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.contentDos}
                onChange={(event) => updateField("contentDos", event.target.value)}
                placeholder="Use customer stories, cite data, stay practical..."
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="contentDonts" label="Content don'ts" hint="Hard rules for the AI to follow — topics to avoid, phrases that feel off-brand, or styles that don't fit. E.g. 'no jargon', 'don't mention competitors by name', 'never use clickbait'." />
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
            <CardTitle>3. Supporting Documents</CardTitle>
            <CardDescription>
              Upload brand guidelines, decks, PDFs, or visual references to strengthen the analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="uploadNotes" label="Notes for uploaded files" hint="Tell the Document Analyst what these files are and how to use them — e.g. 'this is our brand guidelines deck', 'this PDF has our target customer research', 'these are old ad scripts for tone reference'." />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Manifesto generated successfully
            </CardTitle>
            <CardDescription>
              Version {result.version} saved. Review it below, then fine-tune it on the Brand pages.
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
              <Link href="/brand" className={buttonVariants()}>
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
      )}
    </div>
  );
}
