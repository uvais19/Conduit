"use client";

import type { BrandComplianceIssue, OnBrandScore } from "@/lib/types";

function scoreClass(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (score >= 60) return "bg-amber-500/10 text-amber-800 dark:text-amber-400";
  return "bg-red-500/10 text-red-700 dark:text-red-400";
}

type Props = {
  score: OnBrandScore;
  summary?: string;
  issues?: BrandComplianceIssue[];
  strengths?: string[];
};

export function OnBrandScoreCard({ score, summary, issues = [], strengths = [] }: Props) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">On-brand score</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreClass(score.overallScore)}`}>
          {score.overallScore}/100
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {score.source}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(score.computedAt).toLocaleString()}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Tone: {score.toneScore} · Message: {score.messageAlignmentScore} · Guidelines: {score.guidelinesScore}
      </p>

      {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}

      {issues.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Issues</p>
          {issues.map((issue, idx) => (
            <div key={`${issue.category}-${idx}`} className="rounded-md border p-2 text-sm">
              <p className="font-medium">{issue.message}</p>
              <p className="text-xs text-muted-foreground">{issue.suggestion}</p>
            </div>
          ))}
        </div>
      ) : null}

      {strengths.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Strengths</p>
          {strengths.map((strength, idx) => (
            <p key={`${strength}-${idx}`} className="text-sm">
              • {strength}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
