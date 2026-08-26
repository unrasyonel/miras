export type RelationshipType =
  | "parent"
  | "spouse"
  | "partner"
  | "adoptive-parent"
  | "step-parent"
  | "guardian"
  | "other";

export type Person = {
  id: string;
  treeId: string;
  displayName: string;
  nickname?: string;
  gender?: string;
  photoUrl?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  location?: string;
  notes?: string;
  tags?: string[];
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
};

export type Relationship = {
  id: string;
  treeId: string;
  sourcePersonId: string;
  targetPersonId: string;
  type: RelationshipType;
  label?: string;
  color?: string;
  sourceHandle?: string;
  targetHandle?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status?: "married" | "partnered" | "divorced" | "separated" | "widowed" | "custom";
};

export type TreeDocument = {
  schemaVersion: 1;
  tree: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  people: Person[];
  relationships: Relationship[];
  settings: {
    accent: string;
    edgeColors: Record<RelationshipType, string>;
    cardShape: "rectangle" | "oval" | "square";
    showPhotos: boolean;
    showDates: boolean;
    showMiniMap: boolean;
    edgeWidth: "thin" | "medium" | "bold";
  };
};

export type SaveStatus = "loading" | "saving" | "saved" | "offline" | "error";
