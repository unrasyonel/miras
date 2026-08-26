import { describe, expect, it } from "vitest";
import { familyGeometry, familyRoutePoints, roundedFamilyPath } from "./family-layout";

describe("family edge layout", () => {
  it("gives every sibling in one family the same junction", () => {
    const geometry = familyGeometry({ x: 100, y: 100 }, { x: 400, y: 100 }, [420, 460, 500, 440], 248, 104);
    expect(geometry.originX).toBe(374);
    expect(geometry.junctionY).toBeGreaterThan(geometry.originY);
    expect(geometry.junctionY).toBeLessThan(420);
  });

  it("builds rounded branches through the shared junction", () => {
    const path = roundedFamilyPath(300, 150, 280, 500, 430);
    expect(path).toContain("Q 300 280");
    expect(path).toContain("Q 500 280");
  });

  it("routes a lower sibling around a card above it", () => {
    const points = familyRoutePoints(300, 150, 260, 500, 650, [{ x: 420, y: 360, width: 248, height: 104 }]);
    expect(points).toHaveLength(6);
    expect(points[2].x).not.toBe(500);
    expect(points.at(-1)).toEqual({ x: 500, y: 650 });
  });
});
