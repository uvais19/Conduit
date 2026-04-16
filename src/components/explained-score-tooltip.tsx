"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ANALYSIS_SCORE_DESCRIPTION =
  "Historical alignment score from post analysis: Conduit samples your published posts and scores how well they match your brand strategy and manifesto themes (patterns, gaps, engagement context). It reflects past performance—not a live check of a draft you are editing.";

const BRAND_CHECK_SCORE_DESCRIPTION =
  "Brand Check score: evaluates this draft’s caption, hashtags, and CTA against your Brand Manifesto (tone sliders, do’s/don’ts, disclosures, banned words). Use it before submit or publish. This is not the same number as Alignment score on the dashboard, which comes from analysed historical posts.";

const BRAND_SUB_SCORES_DESCRIPTION =
  "Breakdown of the same Brand Check (0–100 each): Tone vs your voice settings, Message vs key messages and goals, Guidelines vs content do’s and don’ts.";

type ExplainedScoreTooltipProps = {
  variant: "analysis" | "brand" | "brand-subscores";
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

/**
 * Wraps a score badge so hover/focus shows what the number measures.
 * Dashboard layout must include TooltipProvider (already on dashboard shell).
 */
export function ExplainedScoreTooltip({
  variant,
  children,
  side = "top",
}: ExplainedScoreTooltipProps) {
  const text =
    variant === "analysis"
      ? ANALYSIS_SCORE_DESCRIPTION
      : variant === "brand-subscores"
        ? BRAND_SUB_SCORES_DESCRIPTION
        : BRAND_CHECK_SCORE_DESCRIPTION;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[inherit]"
          tabIndex={0}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
