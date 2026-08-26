import { describe, expect, it } from "vitest";
import { demoDocument } from "./demo";
import { parseGedcom, toGedcom } from "./gedcom";

describe("GEDCOM", () => {
  it("imports people and family relationships", () => {
    const doc = parseGedcom("0 @I1@ INDI\n1 NAME Ada /Lovelace/\n1 SEX F\n0 @I2@ INDI\n1 NAME Charles /Babbage/\n1 SEX M\n0 @I3@ INDI\n1 NAME Child /Example/\n0 @F1@ FAM\n1 WIFE @I1@\n1 HUSB @I2@\n1 CHIL @I3@\n0 TRLR", demoDocument);
    expect(doc.people).toHaveLength(3);
    expect(doc.relationships.filter((rel) => rel.type === "parent")).toHaveLength(2);
    expect(doc.relationships.some((rel) => rel.type === "spouse")).toBe(true);
  });

  it("exports a valid GEDCOM envelope", () => {
    const output = toGedcom(demoDocument);
    expect(output).toContain("1 GEDC");
    expect(output.endsWith("0 TRLR")).toBe(true);
  });
});
