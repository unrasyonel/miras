import { describe, expect, it } from "vitest";
import { canvasInteraction } from "./canvas-interaction";

describe("canvas gestures", () => {
  it.each(["select", "drag"] as const)("allows touch pan and pinch in %s mode", (mode) => {
    expect(canvasInteraction(mode, true)).toEqual({ selectionOnDrag: false, panOnDrag: true, zoomOnPinch: true });
  });
  it("preserves desktop box selection", () => {
    expect(canvasInteraction("select", false)).toEqual({ selectionOnDrag: true, panOnDrag: false, zoomOnPinch: true });
  });
  it("preserves desktop navigation", () => {
    expect(canvasInteraction("drag", false)).toEqual({ selectionOnDrag: false, panOnDrag: true, zoomOnPinch: true });
  });
});
