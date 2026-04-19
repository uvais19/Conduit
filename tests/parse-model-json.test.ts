import { describe, expect, it } from "vitest";
import {
  extractJsonBlock,
  parseJsonFromModelResponse,
  sliceBalancedJson,
} from "@/lib/ai/parse-model-json";

describe("sliceBalancedJson", () => {
  it("slices a root array without using lastIndexOf brace bug", () => {
    const s = '[{"a":1},{"b":2}]';
    expect(sliceBalancedJson(s, 0)).toBe(s);
  });

  it("slices nested object", () => {
    const s = '{"pillars":[{"name":"x"}]}';
    expect(sliceBalancedJson(s, 0)).toBe(s);
  });
});

describe("extractJsonBlock", () => {
  it("prefers first complete array when prefix text exists", () => {
    const wrapped = 'Here you go:\n[{"x":1}]\nThanks';
    expect(JSON.parse(extractJsonBlock(wrapped))).toEqual([{ x: 1 }]);
  });

  it("handles markdown json fence", () => {
    const t = '```json\n{"ok":true}\n```';
    expect(JSON.parse(extractJsonBlock(t))).toEqual({ ok: true });
  });
});

describe("parseJsonFromModelResponse", () => {
  it("parses BOM-prefixed JSON", () => {
    const s = "\uFEFF{\"a\":1}";
    expect(parseJsonFromModelResponse<{ a: number }>(s)).toEqual({ a: 1 });
  });

  it("parses after prose prefix", () => {
    const s = 'Output:\n{"pillars":[]}';
    expect(parseJsonFromModelResponse<{ pillars: unknown[] }>(s)).toEqual({
      pillars: [],
    });
  });
});
