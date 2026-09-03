import { describe, expect, it } from "vitest";
import { wheelZoomTarget, zoomAroundPoint } from "./wheel-zoom";

describe("wheel zoom", () => {
  it("zooms in for wheel up and out for wheel down", () => {
    expect(wheelZoomTarget(1, -100, 0, 800)).toBeGreaterThan(1);
    expect(wheelZoomTarget(1, 100, 0, 800)).toBeLessThan(1);
  });
  it("normalizes line and pixel wheel deltas", () => {
    expect(wheelZoomTarget(1, 3, 1, 800)).toBe(wheelZoomTarget(1, 48, 0, 800));
  });
  it("keeps zoom within canvas limits", () => {
    expect(wheelZoomTarget(2.4, -1000, 0, 800)).toBe(2.4);
    expect(wheelZoomTarget(.18, 1000, 0, 800)).toBe(.18);
  });
  it("keeps the world point under the cursor stationary", () => {
    const before = { x: 30, y: -40, zoom: .8 };
    const cursor = { x: 300, y: 220 };
    const after = zoomAroundPoint(before, cursor, 1.2);
    expect((cursor.x - after.x) / after.zoom).toBeCloseTo((cursor.x - before.x) / before.zoom);
    expect((cursor.y - after.y) / after.zoom).toBeCloseTo((cursor.y - before.y) / before.zoom);
  });
});
