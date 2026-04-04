/** 0-based index into pillars[], schedule[], or weeklyThemes[] in the strategy JSON (same order as the UI). */
export type PillarFieldProperty = "name" | "description" | "percentage";

export type ScheduleFieldProperty =
  | "postsPerWeek"
  | "preferredDays"
  | "preferredTimes"
  | "contentMix";

export type WeeklyThemeFieldProperty = "theme" | "pillar" | "keyMessage";

export type SuggestionTarget =
  | { section: "pillars"; rowIndex: number; property: PillarFieldProperty }
  | { section: "schedule"; rowIndex: number; property: ScheduleFieldProperty }
  | { section: "weeklyThemes"; rowIndex: number; property: WeeklyThemeFieldProperty };

export type SuggestionItem = {
  field: string;
  current: string;
  suggested: string;
  reasoning: string;
  /** When set, the UI can show this suggestion next to that form control. */
  target?: SuggestionTarget;
};

export type SuggestResponse = {
  section: string;
  suggestions: SuggestionItem[];
  updatedSection: unknown;
  summary: string;
};

export type SectionSuggestBundle = {
  suggestions: SuggestionItem[];
  updatedSection: unknown;
};

/** One-shot suggestion for pillars + schedule + weekly themes */
export type FullStrategySuggestResponse = {
  section: "all";
  summary: string;
  pillars: SectionSuggestBundle;
  schedule: SectionSuggestBundle;
  weeklyThemes: SectionSuggestBundle;
};
