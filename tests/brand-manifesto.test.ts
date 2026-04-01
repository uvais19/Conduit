import { describe, expect, it } from "vitest";
import {
  createEmptyBrandManifesto,
  listToText,
  textToList,
} from "@/lib/brand/manifesto";

describe("brand manifesto helpers", () => {
  it("splits comma and newline list input", () => {
    const result = textToList("alpha, beta\ngamma\n delta");
    expect(result).toEqual(["alpha", "beta", "gamma", "delta"]);
  });

  it("joins list values into multiline text", () => {
    const result = listToText(["one", "two", "three"]);
    expect(result).toBe("one\ntwo\nthree");
  });

  it("creates safe defaults for partial manifesto input", () => {
    const manifesto = createEmptyBrandManifesto({
      businessName: "  Acme Labs  ",
      coreValues: ["", "Innovation"],
    });

    expect(manifesto.businessName).toBe("Acme Labs");
    expect(manifesto.industry).toBe("General Business");
    expect(manifesto.coreValues).toEqual(["Innovation"]);
    expect(manifesto.productsServices.length).toBeGreaterThan(0);
  });
});
