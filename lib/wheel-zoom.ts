export function wheelZoomTarget(zoom: number, delta: number, mode: number, pageHeight: number) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
  return Math.max(.18, Math.min(2.4, zoom * Math.exp(-Math.max(-240, Math.min(240, pixels)) * .0018)));
}

export function zoomAroundPoint(viewport: { x: number; y: number; zoom: number }, point: { x: number; y: number }, zoom: number) {
  return {
    x: point.x - (point.x - viewport.x) / viewport.zoom * zoom,
    y: point.y - (point.y - viewport.y) / viewport.zoom * zoom,
    zoom,
  };
}
