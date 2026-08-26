"use client";

import { useEffect, useRef, useState } from "react";
import { HeartHandshake } from "lucide-react";
import strokes from "@/content/signature-strokes.json";

const SESSION_KEY = "miras:signature-seen:v6";
const DRAW_MS = 2400;

export function SignatureIntro({ force = false, onComplete }: { force?: boolean; onComplete?: () => void }) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"draw" | "brand" | "ready" | "exit">("draw");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!force && sessionStorage.getItem(SESSION_KEY)) {
      queueMicrotask(() => { setVisible(false); onComplete?.(); });
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let frameId = 0;
    let phaseTimer = 0;
    const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const begin = async () => {
      await document.fonts?.ready;
      await nextPaint();
      await nextPaint();
      if (cancelled) return;
      const paths = [...(rootRef.current?.querySelectorAll<SVGPathElement>(".signature-pen") ?? [])];
      const fill = rootRef.current?.querySelector<SVGPathElement>(".signature-fill-path");
      if (!paths.length || !fill) return;
      fill.getBBox();
      if (reduced) {
        fill.removeAttribute("mask");
        phaseTimer = window.setTimeout(() => setPhase("ready"), 80);
        return;
      }
      const startedAt = performance.now() + 80;
      const frame = (now: number) => {
        if (cancelled) return;
        const progress = Math.min(1, Math.max(0, (now - startedAt) / DRAW_MS));
        const eased = 1 - (1 - progress) ** 3;
        paths.forEach((path) => {
          const start = Number(path.dataset.start);
          const end = Number(path.dataset.end);
          const length = Number(path.dataset.length);
          const local = Math.min(1, Math.max(0, (eased - start) / (end - start)));
          path.style.opacity = local > 0 ? "1" : "0";
          path.setAttribute("stroke-dashoffset", String(length * (1 - local)));
        });
        if (progress < 1) frameId = requestAnimationFrame(frame);
        else { setPhase("brand"); phaseTimer = window.setTimeout(() => setPhase("ready"), 1150); }
      };
      frameId = requestAnimationFrame(frame);
    };
    void begin();
    return () => { cancelled = true; cancelAnimationFrame(frameId); window.clearTimeout(phaseTimer); };
  }, [force, onComplete]);

  const start = () => {
    if (!force) sessionStorage.setItem(SESSION_KEY, "1");
    setPhase("exit");
    window.setTimeout(() => { setVisible(false); onComplete?.(); }, 1050);
  };
  if (!visible) return null;

  return (
    <div ref={rootRef} className={`signature-intro phase-${phase}`} aria-label="Miras by Erenson">
      <div className="intro-brand"><span className="intro-logo"><HeartHandshake size={34} /></span><strong>Miras</strong></div>
      <div className="intro-signature"><svg viewBox={strokes.viewBox} role="img" aria-label="Erenson"><defs><mask id="signature-mask" maskUnits="userSpaceOnUse">{strokes.strokes.map((stroke, index) => <path key={index} className="signature-pen" d={stroke.d} fill="none" stroke="white" strokeWidth={strokes.penWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={stroke.length} strokeDashoffset={stroke.length} data-start={stroke.start} data-end={stroke.end} data-length={stroke.length} style={{ opacity: 0 }} />)}</mask></defs><path className="signature-fill-path" d={strokes.fill} fill="currentColor" mask="url(#signature-mask)" /></svg></div>
      <div className="intro-by"><span>by</span><svg viewBox={strokes.viewBox} aria-label="Erenson"><path d={strokes.fill} fill="currentColor" /></svg></div>
      <button className="intro-start" type="button" onClick={start}>Start</button>
    </div>
  );
}
