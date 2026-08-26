import type { TreeDocument } from "./types";

const now = new Date().toISOString();

export const demoDocument: TreeDocument = {
  schemaVersion: 1,
  tree: { id: "miras-main-v2", name: "My family tree", createdAt: now, updatedAt: now },
  people: [],
  relationships: [],
  settings: {
    accent: "#d27643",
    cardShape: "rectangle",
    showPhotos: true,
    showDates: true,
    showMiniMap: true,
    edgeWidth: "medium",
    edgeColors: {
      parent: "#81746f",
      spouse: "#d27643",
      partner: "#7d3b57",
      "adoptive-parent": "#2f6f68",
      "step-parent": "#697386",
      guardian: "#b08238",
      other: "#746f6b",
    },
  },
};
