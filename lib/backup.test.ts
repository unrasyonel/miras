import { describe, expect, it } from "vitest";
import { createMirasBackup, readMirasBackup } from "./backup";
import { demoDocument } from "./demo";

describe("Miras archive", () => {
  it("stores WebP photos outside tree JSON and restores them", () => {
    const document = structuredClone(demoDocument);
    document.people.push({ id: "p1", treeId: document.tree.id, displayName: "Ada", photoUrl: "data:image/webp;base64,AQID", x: 0, y: 0, createdAt: "now", updatedAt: "now" });
    const restored = readMirasBackup(createMirasBackup(document));
    expect(restored.people[0].photoUrl).toBe("data:image/webp;base64,AQID");
  });
});
