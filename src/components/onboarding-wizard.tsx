"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
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
import {
  buildGroundingSummary,
  type DocumentAnalysisResult,
  type ScraperResult,
} from "@/lib/agents/discovery";
import { normalizeOnboardingWebsiteUrl } from "@/lib/onboarding/url";
import { cn } from "@/lib/utils";
import type { BrandManifesto } from "@/lib/types";

const ONBOARDING_STORAGE_KEY = "conduit-onboarding-draft-v1";

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
  scraper: ScraperResult;
  documents: DocumentAnalysisResult;
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

type OnboardingDraft = {
  form: typeof initialForm;
  uploadNotes: string;
  showDetails: boolean;
};

function isValidHttpUrl(raw: string): boolean {
  const normalized = normalizeOnboardingWebsiteUrl(raw);
  if (!normalized) return false;
  try {
    const u = new URL(normalized);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function hostFromUrl(raw: string): string | null {
  try {
    return new URL(normalizeOnboardingWebsiteUrl(raw)).hostname || null;
  } catch {
    return null;
  }
}

function faviconUrl(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [uploadNotes, setUploadNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [branchProgress, setBranchProgress] = useState({
    site: false,
    docs: false,
  });
  const [synthesisActive, setSynthesisActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<string>>(
    new Set()
  );
  const [showDetails, setShowDetails] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [suggestedBusinessName, setSuggestedBusinessName] = useState<
    string | null
  >(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedOnboardingInfo, setSavedOnboardingInfo] = useState<{
    businessName: string;
    websiteUrl?: string;
  } | null>(null);
  const [savedOnboardingChecked, setSavedOnboardingChecked] = useState(false);

  const reviewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const draft = JSON.parse(raw) as OnboardingDraft;
      if (draft.form && typeof draft.form === "object") {
        setForm({ ...initialForm, ...draft.form });
      }
      if (typeof draft.uploadNotes === "string") {
        setUploadNotes(draft.uploadNotes);
      }
      if (draft.showDetails) {
        setShowDetails(true);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/brand");
        if (res.ok) {
          const data = (await res.json()) as { manifesto: BrandManifesto | null };
          if (!cancelled && data.manifesto) {
            setSavedOnboardingInfo({
              businessName: data.manifesto.businessName,
              websiteUrl: data.manifesto.websiteUrl,
            });
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setSavedOnboardingChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || result) return;
    const draft: OnboardingDraft = {
      form,
      uploadNotes,
      showDetails,
    };
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [hydrated, form, uploadNotes, showDetails, result]);

  useEffect(() => {
    if (result) {
      try {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [result]);

  function scrollReviewIntoView() {
    requestAnimationFrame(() => {
      reviewSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
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

  function clearDraftAndReset() {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setForm(initialForm);
    setUploadNotes("");
    setShowDetails(false);
    setAdvancedOpen(false);
    setSuggestedBusinessName(null);
    setAiSuggestedFields(new Set());
    setError("");
    setResult(null);
  }

  async function handleAnalyzeWebsite() {
    setError("");
    const normalized = normalizeOnboardingWebsiteUrl(form.websiteUrl);
    if (!normalized) {
      setError("Enter your website URL.");
      return;
    }
    if (!isValidHttpUrl(form.websiteUrl)) {
      setError("Enter a valid website URL (for example https://example.com).");
      return;
    }

    setForm((c) => ({ ...c, websiteUrl: normalized }));
    setPrefilling(true);
    setSuggestedBusinessName(null);

    try {
      const response = await fetch("/api/onboarding/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: normalized,
          businessName: form.businessName,
          industry: form.industry,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to analyze your website");
      }

      const suggestions = data.suggestions as PrefillSuggestions;
      const filledFields = new Set<string>();

      setForm((current) => {
        const next = { ...current, websiteUrl: normalized };
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
      const suggested = (data.suggestedBusinessName as string | undefined)?.trim();
      if (suggested) {
        setSuggestedBusinessName(suggested);
      }
      setShowDetails(true);
      scrollReviewIntoView();
    } catch (prefillError) {
      setError(
        prefillError instanceof Error
          ? prefillError.message
          : "Unable to analyze your website"
      );
    } finally {
      setPrefilling(false);
    }
  }

  function handleManualEntry() {
    setError("");
    setSuggestedBusinessName(null);
    setShowDetails(true);
    scrollReviewIntoView();
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

  async function runDiscoveryStream() {
    setSubmitting(true);
    setError("");
    setGenerationMessage("Connecting…");
    setBranchProgress({ site: false, docs: false });
    setSynthesisActive(false);

    const payload = {
      ...form,
      websiteUrl: normalizeOnboardingWebsiteUrl(form.websiteUrl),
    };

    try {
      const response = await fetch("/api/onboarding/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok && !contentType.includes("text/event-stream")) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to generate your brand manifesto");
      }

      if (!response.body) {
        throw new Error("Unable to generate your brand manifesto");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
              if (currentEvent === "progress") {
                const step = data.step as string;
                const message =
                  typeof data.message === "string" ? data.message : "";
                if (message) {
                  setGenerationMessage(message);
                }
                if (step === "gathering") {
                  setBranchProgress({ site: false, docs: false });
                  setSynthesisActive(false);
                } else if (step === "site_complete") {
                  setBranchProgress((current) => ({ ...current, site: true }));
                  setSynthesisActive(false);
                } else if (step === "documents_complete") {
                  setBranchProgress((current) => ({ ...current, docs: true }));
                  setSynthesisActive(false);
                } else if (step === "synthesizing") {
                  setBranchProgress({ site: true, docs: true });
                  setSynthesisActive(true);
                }
              } else if (currentEvent === "done") {
                const donePayload = data as { manifesto: BrandManifesto };
                setResult(data as unknown as DiscoveryResponse);
                setSavedOnboardingInfo({
                  businessName: donePayload.manifesto.businessName,
                  websiteUrl: donePayload.manifesto.websiteUrl,
                });
                setSavedOnboardingChecked(true);
                router.refresh();
              } else if (currentEvent === "error") {
                throw new Error(
                  typeof data.error === "string"
                    ? data.error
                    : "Unable to generate your brand manifesto"
                );
              }
            } catch (parseError) {
              if (
                parseError instanceof Error &&
                parseError.message !== "Unexpected end of JSON input"
              ) {
                throw parseError;
              }
            }
            currentEvent = "";
          }
        }
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to generate your brand manifesto"
      );
    } finally {
      setSubmitting(false);
      setGenerationMessage("");
      setBranchProgress({ site: false, docs: false });
      setSynthesisActive(false);
    }
  }

  const hostname = hostFromUrl(form.websiteUrl);
  const canAnalyze =
    isValidHttpUrl(form.websiteUrl) && !prefilling && !result;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Set up your brand</h1>
          <p className="text-muted-foreground">
            Tell us who you are and where you live online. We read your site to
            draft your brand profile — you review and generate your Brand
            Manifesto when you are ready.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {savedOnboardingChecked && savedOnboardingInfo && !result && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">You&apos;re already onboarded</CardTitle>
            <CardDescription>
              A Brand Manifesto is on file for this business. You can run through
              onboarding again to add a new version, or open your manifesto to
              edit it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Company
              </p>
              <p className="mt-0.5 font-medium leading-snug">
                {savedOnboardingInfo.businessName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Website
              </p>
              {savedOnboardingInfo.websiteUrl ? (
                <a
                  href={savedOnboardingInfo.websiteUrl}
                  className="mt-0.5 block break-all font-medium text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {savedOnboardingInfo.websiteUrl}
                </a>
              ) : (
                <p className="mt-0.5 text-muted-foreground">
                  Not on file (saved before we stored this)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {submitting && (
        <Card className="border-primary/25 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Generating your Brand Manifesto
            </CardTitle>
            <CardDescription className="text-foreground/90">
              {generationMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              {branchProgress.site ? (
                <Check
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
              ) : (
                <span
                  className="mt-1 size-3 shrink-0 rounded-full border border-muted-foreground/40"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  branchProgress.site ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {branchProgress.site
                  ? "Website input reviewed"
                  : "Website input (in progress)"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              {branchProgress.docs ? (
                <Check
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
              ) : (
                <span
                  className="mt-1 size-3 shrink-0 rounded-full border border-muted-foreground/40"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  branchProgress.docs ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {branchProgress.docs
                  ? "Uploads and notes reviewed"
                  : "Uploads and notes (in progress)"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              {synthesisActive ? (
                <Loader2
                  className="mt-0.5 size-4 shrink-0 animate-spin text-primary"
                  aria-hidden
                />
              ) : branchProgress.site && branchProgress.docs ? (
                <span
                  className="mt-1 size-3 shrink-0 rounded-full border border-primary/50"
                  aria-hidden
                />
              ) : (
                <span
                  className="mt-1 size-3 shrink-0 rounded-full border border-muted-foreground/40"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  synthesisActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Writing manifesto
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {!result && (
        <form
          className="space-y-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <Card>
            <CardHeader>
              <CardTitle>Your company</CardTitle>
              <CardDescription>
                Add your public website so we can infer your audience, offers,
                and tone. No site yet? You can still enter everything by hand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabelWithHint
                    htmlFor="businessName"
                    label="Business name"
                    hint="The name that should appear in your content and brand profile. You can change it after we read your site."
                  />
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(event) =>
                      updateField("businessName", event.target.value)
                    }
                    placeholder="Acme Marketing"
                    autoComplete="organization"
                    required={showDetails}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabelWithHint
                    htmlFor="websiteUrl"
                    label="Website URL"
                    hint="Your homepage. We fetch public content to pre-fill the fields below."
                  />
                  <Input
                    id="websiteUrl"
                    value={form.websiteUrl}
                    onChange={(event) =>
                      updateField("websiteUrl", event.target.value)
                    }
                    onBlur={() => {
                      const n = normalizeOnboardingWebsiteUrl(form.websiteUrl);
                      if (n !== form.websiteUrl) {
                        updateField("websiteUrl", n);
                      }
                    }}
                    placeholder="example.com or https://example.com"
                    inputMode="url"
                    autoComplete="url"
                  />
                </div>
              </div>

              {hostname && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {/* Favicon is third-party and dynamic; next/image would need remotePatterns for each host */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={faviconUrl(hostname)}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 shrink-0 rounded-sm bg-background"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <p className="text-muted-foreground">
                    We will read{" "}
                    <span className="font-medium text-foreground">{hostname}</span>{" "}
                    to draft your profile.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  disabled={!canAnalyze}
                  onClick={() => void handleAnalyzeWebsite()}
                  className="gap-2"
                >
                  <Sparkles className="size-4 shrink-0" />
                  {prefilling ? "Reading your site…" : "Analyze my website"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={handleManualEntry}
                >
                  No website — fill in details manually
                </Button>
              </div>
            </CardContent>
          </Card>

          {showDetails && (
            <div ref={reviewSectionRef} className="space-y-6">
              {suggestedBusinessName &&
                suggestedBusinessName.toLowerCase() !==
                  form.businessName.trim().toLowerCase() && (
                  <div className="flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm">
                      <span className="font-medium">Suggested name from your site: </span>
                      <span className="text-foreground">{suggestedBusinessName}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          updateField("businessName", suggestedBusinessName);
                          setSuggestedBusinessName(null);
                        }}
                      >
                        Use this name
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSuggestedBusinessName(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

              <Card>
                <CardHeader>
                  <CardTitle>Review your business</CardTitle>
                  <CardDescription>
                    Check what we inferred (fields marked as AI suggestions) and
                    edit anything that is off before you generate your manifesto.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabelWithHint
                      htmlFor="industry"
                      label="Industry"
                      hint="The sector you operate in — be specific so tone and strategy match."
                      aiSuggested={aiSuggestedFields.has("industry")}
                    />
                    <Input
                      id="industry"
                      value={form.industry}
                      onChange={(event) =>
                        updateField("industry", event.target.value)
                      }
                      placeholder="B2B SaaS"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <FieldLabelWithHint
                      htmlFor="offerings"
                      label="Products or services"
                      hint="What you sell or deliver — one per line."
                      aiSuggested={aiSuggestedFields.has("offerings")}
                    />
                    <textarea
                      id="offerings"
                      className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                      value={form.offerings}
                      onChange={(event) =>
                        updateField("offerings", event.target.value)
                      }
                      placeholder="List your main offers, one per line."
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <FieldLabelWithHint
                      htmlFor="targetAudience"
                      label="Target audience"
                      hint="Ideal customers — roles, goals, and pain points."
                      aiSuggested={aiSuggestedFields.has("targetAudience")}
                    />
                    <textarea
                      id="targetAudience"
                      className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                      value={form.targetAudience}
                      onChange={(event) =>
                        updateField("targetAudience", event.target.value)
                      }
                      placeholder="Who do you serve?"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <FieldLabelWithHint
                      htmlFor="goals"
                      label="Social media goals"
                      hint="What social should achieve — awareness, leads, traffic, etc."
                      aiSuggested={aiSuggestedFields.has("goals")}
                    />
                    <textarea
                      id="goals"
                      className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                      value={form.goals}
                      onChange={(event) =>
                        updateField("goals", event.target.value)
                      }
                      placeholder="Brand awareness, lead generation…"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle>More options</CardTitle>
                    <CardDescription>
                      Differentiators, voice, guardrails, and optional file uploads.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => setAdvancedOpen((o) => !o)}
                    aria-expanded={advancedOpen}
                  >
                    {advancedOpen ? "Hide" : "Show"}
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        advancedOpen && "rotate-180"
                      )}
                    />
                  </Button>
                </CardHeader>
                {advancedOpen && (
                  <CardContent className="grid gap-4 border-t pt-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabelWithHint
                        htmlFor="differentiators"
                        label="Differentiators / USPs"
                        hint="What makes you stand out."
                        aiSuggested={aiSuggestedFields.has("differentiators")}
                      />
                      <textarea
                        id="differentiators"
                        className="min-h-[5.5rem] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={form.differentiators}
                        onChange={(event) =>
                          updateField("differentiators", event.target.value)
                        }
                        placeholder="What makes you different?"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabelWithHint
                        htmlFor="brandTone"
                        label="Brand tone / adjectives"
                        hint="How your brand should sound."
                        aiSuggested={aiSuggestedFields.has("brandTone")}
                      />
                      <textarea
                        id="brandTone"
                        className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={form.brandTone}
                        onChange={(event) =>
                          updateField("brandTone", event.target.value)
                        }
                        placeholder="Helpful, confident, witty…"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <FieldLabelWithHint
                        htmlFor="notes"
                        label="Extra notes"
                        hint="Positioning, competitors, pains — anything useful."
                      />
                      <textarea
                        id="notes"
                        className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={form.notes}
                        onChange={(event) =>
                          updateField("notes", event.target.value)
                        }
                        placeholder="Any other context…"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabelWithHint
                        htmlFor="contentDos"
                        label="Content do's"
                        hint="What the AI should lean into."
                        aiSuggested={aiSuggestedFields.has("contentDos")}
                      />
                      <textarea
                        id="contentDos"
                        className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={form.contentDos}
                        onChange={(event) =>
                          updateField("contentDos", event.target.value)
                        }
                        placeholder="Customer stories, cite data…"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabelWithHint
                        htmlFor="contentDonts"
                        label="Content don'ts"
                        hint="Hard rules — topics or styles to avoid."
                        aiSuggested={aiSuggestedFields.has("contentDonts")}
                      />
                      <textarea
                        id="contentDonts"
                        className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={form.contentDonts}
                        onChange={(event) =>
                          updateField("contentDonts", event.target.value)
                        }
                        placeholder="Avoid jargon, no clickbait…"
                      />
                    </div>

                    <div className="space-y-4 md:col-span-2">
                      <FieldLabelWithHint
                        htmlFor="uploadNotes"
                        label="Notes for uploaded files"
                        hint="What each file is for (guidelines, research, tone samples)."
                      />
                      <textarea
                        id="uploadNotes"
                        className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        value={uploadNotes}
                        onChange={(event) => setUploadNotes(event.target.value)}
                        placeholder="Context for uploads…"
                      />
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <Input type="file" multiple onChange={handleUpload} />
                        <Button type="button" variant="outline" disabled={uploading}>
                          <Upload className="mr-2 size-4" />
                          {uploading ? "Uploading…" : "Upload files"}
                        </Button>
                      </div>
                      {form.documents.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {form.documents.map((document, index) => (
                            <Badge
                              key={`${document.fileName}-${index}`}
                              variant="outline"
                            >
                              {document.fileName} • {document.fileType}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => void runDiscoveryStream()}
                >
                  <Wand2 className="mr-2 size-4" />
                  {submitting ? "Generating…" : "Generate Brand Manifesto"}
                </Button>
                <Link
                  href="/brand"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Open current manifesto
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={clearDraftAndReset}
                >
                  Clear draft and start over
                </Button>
              </div>
            </div>
          )}
        </form>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Brand Manifesto ready
            </CardTitle>
            <CardDescription>
              Version {result.version} saved. Continue when you are ready — nothing
              will navigate automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-foreground/90">
              {buildGroundingSummary(
                {
                  ...form,
                  websiteUrl: normalizeOnboardingWebsiteUrl(form.websiteUrl),
                },
                result.scraper,
                result.documents
              )}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Identity</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong>{result.manifesto.businessName}</strong> •{" "}
                  {result.manifesto.industry}
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
                <h3 className="font-semibold">From your inputs</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Site source: {result.scraper.source}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.documents.summary}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-5">
              <p className="text-sm text-muted-foreground">
                Want a different angle? Regenerate uses the same answers and uploads
                from this wizard and saves a new version. Or edit your responses first.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => void runDiscoveryStream()}
                  className="gap-2"
                >
                  <Wand2 className="size-4 shrink-0" />
                  {submitting ? "Regenerating…" : "Regenerate from same inputs"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => {
                    setError("");
                    setResult(null);
                  }}
                >
                  Edit responses
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className={buttonVariants()}
                onClick={() => {
                  void router.push("/strategy/generating");
                }}
              >
                Continue to content strategy
              </Button>
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
      )}
    </div>
  );
}
