"use client";

import { Info, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type FieldLabelWithHintProps = {
  htmlFor?: string;
  label: string;
  hint: string;
  /** When true, shows a sparkles icon explaining the value was AI-suggested */
  aiSuggested?: boolean;
  className?: string;
};

export function FieldLabelWithHint({
  htmlFor,
  label,
  hint,
  aiSuggested,
  className,
}: FieldLabelWithHintProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {aiSuggested ? (
        <Tooltip>
          <TooltipTrigger
            type="button"
            className="text-violet-500 transition-colors hover:text-violet-600"
          >
            <Sparkles className="size-3" />
            <span className="sr-only">AI suggested</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            AI suggested — edit to customise
          </TooltipContent>
        </Tooltip>
      ) : null}
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
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
