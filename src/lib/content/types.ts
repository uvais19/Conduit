import { z } from "zod";
import { platformType } from "@/lib/types";

export const variantLabelSchema = z.enum(["A", "B", "C"]);

export const mediaTypeSchema = z.enum([
  "text-only",
  "image",
  "carousel",
  "story",
  "video",
]);

export const carouselSlideSchema = z.object({
  id: z.string(),
  heading: z.string().min(1, "Heading is required"),
  body: z.string().min(1, "Slide body is required"),
  imageUrl: z.string().optional(),
});

export const storyTemplateSchema = z.object({
  template: z.enum(["bold-offer", "minimal-quote", "countdown-launch"]),
  headline: z.string().min(1),
  subheadline: z.string().optional(),
  ctaText: z.string().optional(),
  backgroundUrl: z.string().optional(),
});

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
  mediaUrls: z.array(z.string()).optional(),
  mediaType: mediaTypeSchema.optional(),
  carousel: z.array(carouselSlideSchema).optional(),
  storyTemplate: storyTemplateSchema.optional(),
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
  mediaUrls: string[];
  mediaType: z.infer<typeof mediaTypeSchema>;
  carousel: z.infer<typeof carouselSlideSchema>[];
  storyTemplate: z.infer<typeof storyTemplateSchema> | null;
  status: "draft" | "in-review" | "revision-requested" | "approved" | "scheduled" | "published" | "failed";
  variantGroup: string;
  variantLabel: VariantLabel;
  scheduledAt: string | null;
  publishedAt: string | null;
  platformPostId: string | null;
  createdAt: string;
  updatedAt: string;
};

export const visualPlanRequestSchema = z.object({
  draftId: z.string().min(1),
  objective: z.string().default("engagement"),
  styleHint: z.string().default("clean and modern"),
});

export const imageGenerateRequestSchema = z.object({
  draftId: z.string().min(1),
  prompt: z.string().min(1),
  aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]).default("1:1"),
});
