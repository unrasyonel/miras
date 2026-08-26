"use client";

import type { Locale } from "@/lib/i18n";
import { messages } from "@/lib/i18n";

export function EmptyTreeState({ locale }: { locale: Locale }) {
  const copy = messages[locale];
  return (
    <>
      <div className="empty-state" aria-live="polite">
        <svg className="growing-tree" viewBox="0 0 180 180" aria-hidden="true">
          <path pathLength="1" className="tree-ground" d="M42 151 C72 143 108 143 139 151" />
          <path pathLength="1" className="tree-stroke tree-trunk" d="M91 148 C87 119 94 91 90 54" />
          <path pathLength="1" className="tree-stroke branch-one" d="M90 104 C71 92 59 78 53 61" />
          <path pathLength="1" className="tree-stroke branch-two" d="M91 91 C110 80 122 65 128 47" />
          <path pathLength="1" className="tree-stroke branch-three" d="M90 72 C79 61 74 48 75 35" />
          <path pathLength="1" className="tree-stroke branch-four" d="M91 121 C110 113 126 102 138 86" />
          <g className="tree-leaves"><circle cx="51" cy="56" r="9"/><circle cx="72" cy="32" r="8"/><circle cx="130" cy="43" r="10"/><circle cx="141" cy="82" r="8"/><circle cx="115" cy="69" r="7"/></g>
        </svg>
        <h1>{copy.emptyTitle}</h1>
        <p>{copy.emptyBody}</p>
      </div>
      <div className="empty-invitation">
        <span>{copy.addPerson}</span>
        <svg viewBox="0 0 116 54" aria-hidden="true"><path d="M5 12 C38 4 72 8 102 39"/><circle cx="19" cy="10" r="2"/><circle cx="34" cy="8" r="2"/><path d="m93 37 11 4-3-11"/></svg>
      </div>
    </>
  );
}
