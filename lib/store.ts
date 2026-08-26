"use client";

import { create } from "zustand";
import { demoDocument } from "./demo";
import { sharedParentLocation } from "./turkey-locations";
import type { Person, Relationship, RelationshipType, SaveStatus, TreeDocument } from "./types";

type History = { past: TreeDocument[]; future: TreeDocument[] };
type TreeState = {
  document: TreeDocument;
  selectedPersonId: string | null;
  selectedPersonMode: "view" | "edit";
  saveStatus: SaveStatus;
  hydrated: boolean;
  history: History;
  setHydrated: (document?: TreeDocument) => void;
  setSaveStatus: (status: SaveStatus) => void;
  selectPerson: (id: string | null, mode?: "view" | "edit") => void;
  addPerson: (name?: string, position?: { x: number; y: number }) => string;
  updatePerson: (id: string, patch: Partial<Person>, recordHistory?: boolean) => void;
  movePerson: (id: string, x: number, y: number) => void;
  setPositions: (positions: Record<string, { x: number; y: number }>) => void;
  updateSettings: (patch: Partial<TreeDocument["settings"]>) => void;
  deletePerson: (id: string) => void;
  addRelationship: (sourcePersonId: string, targetPersonId: string, type: RelationshipType, handles?: { sourceHandle?: string | null; targetHandle?: string | null }) => boolean;
  updateRelationship: (id: string, patch: Partial<Relationship>) => void;
  addChildForRelationship: (relationshipId: string, name?: string) => string | null;
  deleteRelationship: (id: string) => void;
  replaceDocument: (document: TreeDocument) => void;
  undo: () => void;
  redo: () => void;
};

const clone = (document: TreeDocument): TreeDocument => structuredClone(document);
const timestamp = () => new Date().toISOString();

function withHistory(state: TreeState, document: TreeDocument) {
  return {
    document,
    history: { past: [...state.history.past.slice(-39), clone(state.document)], future: [] },
    saveStatus: "saving" as const,
  };
}

export const useTreeStore = create<TreeState>((set, get) => ({
  document: demoDocument,
  selectedPersonId: null,
  selectedPersonMode: "view",
  saveStatus: "loading",
  hydrated: false,
  history: { past: [], future: [] },
  setHydrated: (document) => set({ document: document ?? demoDocument, hydrated: true, saveStatus: "saved", history: { past: [], future: [] } }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  selectPerson: (selectedPersonId, selectedPersonMode = "view") => set({ selectedPersonId, selectedPersonMode }),
  addPerson: (name = "New person", position) => {
    const id = crypto.randomUUID();
    set((state) => {
      const now = timestamp();
      const document = clone(state.document);
      let slot = document.people.length;
      let placed = position ?? { x: 180 + (slot % 5) * 290, y: 190 + Math.floor(slot / 5) * 210 };
      while (!position && document.people.some((person) => Math.abs(person.x - placed.x) < 270 && Math.abs(person.y - placed.y) < 180)) {
        slot += 1;
        placed = { x: 180 + (slot % 5) * 290, y: 190 + Math.floor(slot / 5) * 210 };
      }
      document.people.push({ id, treeId: document.tree.id, displayName: name, x: placed.x, y: placed.y, createdAt: now, updatedAt: now });
      document.tree.updatedAt = now;
      return { ...withHistory(state, document), selectedPersonId: null };
    });
    return id;
  },
  updatePerson: (id, patch, recordHistory = true) => set((state) => {
    const document = clone(state.document);
    const person = document.people.find((item) => item.id === id);
    if (!person) return state;
    Object.assign(person, patch, { id, treeId: person.treeId, updatedAt: timestamp() });
    document.tree.updatedAt = timestamp();
    return recordHistory ? withHistory(state, document) : { document, saveStatus: "saving" };
  }),
  movePerson: (id, x, y) => get().updatePerson(id, { x, y }),
  setPositions: (positions) => set((state) => {
    const document = clone(state.document);
    const now = timestamp();
    document.people.forEach((person) => {
      const position = positions[person.id];
      if (position) Object.assign(person, position, { updatedAt: now });
    });
    document.tree.updatedAt = now;
    return withHistory(state, document);
  }),
  updateSettings: (patch) => set((state) => {
    const document = clone(state.document);
    Object.assign(document.settings, patch);
    document.tree.updatedAt = timestamp();
    return withHistory(state, document);
  }),
  deletePerson: (id) => set((state) => {
    const document = clone(state.document);
    document.people = document.people.filter((person) => person.id !== id);
    document.relationships = document.relationships.filter((rel) => rel.sourcePersonId !== id && rel.targetPersonId !== id);
    document.tree.updatedAt = timestamp();
    return { ...withHistory(state, document), selectedPersonId: state.selectedPersonId === id ? null : state.selectedPersonId };
  }),
  addRelationship: (sourcePersonId, targetPersonId, type, handles) => {
    if (sourcePersonId === targetPersonId) return false;
    const symmetric = type === "spouse" || type === "partner";
    const duplicate = get().document.relationships.some((rel) =>
      rel.type === type && rel.sourcePersonId === sourcePersonId && rel.targetPersonId === targetPersonId ||
      symmetric && rel.type === type && rel.sourcePersonId === targetPersonId && rel.targetPersonId === sourcePersonId,
    );
    if (duplicate) return false;
    set((state) => {
      const document = clone(state.document);
      document.relationships.push({
        id: crypto.randomUUID(),
        treeId: document.tree.id,
        sourcePersonId,
        targetPersonId,
        type,
        sourceHandle: handles?.sourceHandle ?? undefined,
        targetHandle: handles?.targetHandle ?? undefined,
      });
      if (type === "parent") {
        const child = document.people.find((person) => person.id === targetPersonId);
        const parentLocations = document.relationships
          .filter((relationship) => relationship.type === "parent" && relationship.targetPersonId === targetPersonId)
          .map((relationship) => document.people.find((person) => person.id === relationship.sourcePersonId)?.location)
          .filter((location): location is string => Boolean(location));
        if (child && !child.location && parentLocations.length >= 2) {
          child.location = sharedParentLocation(parentLocations[0], parentLocations[1]);
          if (child.location) child.updatedAt = timestamp();
        }
      }
      document.tree.updatedAt = timestamp();
      return withHistory(state, document);
    });
    return true;
  },
  updateRelationship: (id, patch) => set((state) => {
    const document = clone(state.document);
    const relationship = document.relationships.find((item) => item.id === id);
    if (!relationship) return state;
    Object.assign(relationship, patch, { id, treeId: relationship.treeId });
    document.tree.updatedAt = timestamp();
    return withHistory(state, document);
  }),
  addChildForRelationship: (relationshipId, name = "New child") => {
    const state = get();
    const relationship = state.document.relationships.find((item) => item.id === relationshipId);
    if (!relationship) return null;
    const source = state.document.people.find((item) => item.id === relationship.sourcePersonId);
    const target = state.document.people.find((item) => item.id === relationship.targetPersonId);
    if (!source || !target) return null;
    const childId = state.addPerson(name, { x: (source.x + target.x) / 2, y: Math.max(source.y, target.y) + 250 });
    get().addRelationship(source.id, childId, "parent");
    get().addRelationship(target.id, childId, "parent");
    return childId;
  },
  deleteRelationship: (id) => set((state) => {
    const document = clone(state.document);
    document.relationships = document.relationships.filter((rel) => rel.id !== id);
    document.tree.updatedAt = timestamp();
    return withHistory(state, document);
  }),
  replaceDocument: (document) => set((state) => ({ ...withHistory(state, document), selectedPersonId: null })),
  undo: () => set((state) => {
    const previous = state.history.past.at(-1);
    if (!previous) return state;
    return { document: previous, history: { past: state.history.past.slice(0, -1), future: [clone(state.document), ...state.history.future] }, saveStatus: "saving" };
  }),
  redo: () => set((state) => {
    const next = state.history.future[0];
    if (!next) return state;
    return { document: next, history: { past: [...state.history.past, clone(state.document)], future: state.history.future.slice(1) }, saveStatus: "saving" };
  }),
}));
