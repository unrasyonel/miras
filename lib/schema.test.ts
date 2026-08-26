import { describe, expect, it } from "vitest";
import { demoDocument } from "./demo";
import { treeDocumentSchema } from "./schema";

describe("tree document schema", () => {
  it("round-trips canonical JSON", () => {
    const imported = JSON.parse(JSON.stringify(demoDocument));
    expect(treeDocumentSchema.parse(imported)).toEqual(demoDocument);
  });

  it("rejects relationships to missing people", () => {
    const invalid = structuredClone(demoDocument);
    invalid.people.push({ id: "a", treeId: invalid.tree.id, displayName: "A", x: 0, y: 0, createdAt: invalid.tree.createdAt, updatedAt: invalid.tree.updatedAt });
    invalid.relationships.push({ id: "r", treeId: invalid.tree.id, sourcePersonId: "a", targetPersonId: "missing", type: "parent" });
    expect(treeDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects duplicate relationships", () => {
    const invalid = structuredClone(demoDocument);
    invalid.people.push(
      { id: "a", treeId: invalid.tree.id, displayName: "A", x: 0, y: 0, createdAt: invalid.tree.createdAt, updatedAt: invalid.tree.updatedAt },
      { id: "b", treeId: invalid.tree.id, displayName: "B", x: 100, y: 0, createdAt: invalid.tree.createdAt, updatedAt: invalid.tree.updatedAt },
    );
    invalid.relationships.push(
      { id: "r1", treeId: invalid.tree.id, sourcePersonId: "a", targetPersonId: "b", type: "spouse" },
      { id: "r2", treeId: invalid.tree.id, sourcePersonId: "b", targetPersonId: "a", type: "spouse" },
    );
    expect(treeDocumentSchema.safeParse(invalid).success).toBe(false);
  });
});
