import Dexie, { type EntityTable } from "dexie";
import type { TreeDocument } from "./types";

type StoredDocument = { id: string; updatedAt: string; document: TreeDocument };

class FamilyTreeDatabase extends Dexie {
  documents!: EntityTable<StoredDocument, "id">;

  constructor() {
    super("miras-family-tree");
    this.version(1).stores({ documents: "id, updatedAt" });
  }
}

export const db = new FamilyTreeDatabase();

export async function loadLocalDocument(id: string) {
  return (await db.documents.get(id))?.document;
}

export async function saveLocalDocument(document: TreeDocument) {
  await db.documents.put({ id: document.tree.id, updatedAt: document.tree.updatedAt, document });
}
