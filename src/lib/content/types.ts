import { z } from "zod";
import { platformType } from "@/lib/types";

export const variantLabelSchema = z.enum(["A", "B", "C"]);

export const contentGenerationRequestSchema = z.object({
  platform: platformType,
  pillar: z.string().min(1, "Pillar is required"),
  topic: z.string().min(1, "Topic is required"),
  objective: z.string().min(1).default("engagement"),
  audience: z.string().min(1).default("general audience"),
  voice: z.string().min(1).default("clear, helpful, and confident"),
  cta: z.string().min(1).default("Learn more"),
  generateVariants: z.boolean().default(true),
});

export const draftUpdateSchema = z.object({
  caption: z.string().min(1).optional(),
  hashtags: z.array(z.string()).optional(),
  cta: z.string().optional(),
  pillar: z.string().optional(),
  status: z
    .enum([
      "draft",
      "in-review",
      "revision-requested",
      "approved",
      "scheduled",
      "published",
      "failed",
    ])
    .optional(),
});

export type ContentGenerationRequest = z.infer<
  typeof contentGenerationRequestSchema
>;

export type VariantLabel = z.infer<typeof variantLabelSchema>;

export type GeneratedVariant = {
  variantLabel: VariantLabel;
  caption: string;
  hashtags: string[];
  cta: string;
};

export type ContentDraftRecord = {
  id: string;
  tenantId: string;
  platform: z.infer<typeof platformType>;
  pillar: string;
  caption: string;
  hashtags: string[];
  cta: string;
  status: "draft" | "in-review" | "revision-requested" | "approved" | "scheduled" | "published" | "failed";
  variantGroup: string;
  variantLabel: VariantLabel;
  createdAt: string;
  updatedAt: string;
};
