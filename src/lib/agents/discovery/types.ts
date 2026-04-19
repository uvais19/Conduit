import { z } from "zod";
import type { BrandManifesto } from "@/lib/types";

export const discoveryDocumentSchema = z.object({
  id: z.string().optional(),
  fileName: z.string().min(1, "File name is required"),
  fileType: z.enum(["pdf", "docx", "pptx", "image"]),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  extractedText: z.string().optional(),
});

export const discoveryInputSchema = z.object({
  websiteUrl: z.string().trim().optional().default(""),
  businessName: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  targetAudience: z.string().min(1, "Target audience is required"),
  goals: z.string().min(1, "Goals are required"),
  offerings: z.string().min(1, "Offerings are required"),
  differentiators: z.string().trim().optional().default(""),
  brandTone: z.string().trim().optional().default(""),
  contentDos: z.string().trim().optional().default(""),
  contentDonts: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  documents: z.array(discoveryDocumentSchema).optional().default([]),
});

export type DiscoveryDocument = z.infer<typeof discoveryDocumentSchema>;
export type DiscoveryInput = z.infer<typeof discoveryInputSchema>;

export type ScraperResult = {
  websiteUrl?: string;
  title?: string;
  description?: string;
  summary: string;
  keyPoints: string[];
  source: "website" | "manual" | "unavailable";
};

export type DocumentAnalysisResult = {
  summary: string;
  insights: string[];
  documentCount: number;
};

export type DiscoveryResult = {
  manifesto: BrandManifesto;
  scraper: ScraperResult;
  documents: DocumentAnalysisResult;
};

export type DiscoveryProgressPhase =
  | "gathering"
  | "site_complete"
  | "documents_complete"
  | "synthesizing";

export type DiscoveryProgressEvent = {
  phase: DiscoveryProgressPhase;
  message: string;
  source?: ScraperResult["source"];
  documentCount?: number;
};

export type DiscoveryProgressHandler = (event: DiscoveryProgressEvent) => void;
