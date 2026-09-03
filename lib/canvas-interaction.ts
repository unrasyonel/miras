export function canvasInteraction(mode: "select" | "drag", touch: boolean) {
  return {
    selectionOnDrag: mode === "select" && !touch,
    panOnDrag: mode === "drag" || touch,
    zoomOnPinch: true,
  };
}
