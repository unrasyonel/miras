import { z } from "zod";

const relationshipType = z.enum([
  "parent",
  "spouse",
  "partner",
  "adoptive-parent",
  "step-parent",
  "guardian",
  "other",
]);

const personSchema = z.object({
  id: z.string().min(1).max(100),
  treeId: z.string().min(1).max(100),
  displayName: z.string().min(1).max(180),
  nickname: z.string().max(100).optional(),
  gender: z.string().max(60).optional(),
  photoUrl: z.string().max(5_000_000).optional(),
  birthDate: z.string().max(30).optional(),
  birthPlace: z.string().max(180).optional(),
  deathDate: z.string().max(30).optional(),
  deathPlace: z.string().max(180).optional(),
  location: z.string().max(180).optional(),
  notes: z.string().max(100_000).optional(),
  tags: z.array(z.string().max(50)).max(40).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const relationshipSchema = z.object({
  id: z.string().min(1).max(100),
  treeId: z.string().min(1).max(100),
  sourcePersonId: z.string().min(1).max(100),
  targetPersonId: z.string().min(1).max(100),
  type: relationshipType,
  label: z.string().max(100).optional(),
  color: z.string().max(30).optional(),
  sourceHandle: z.string().max(30).optional(),
  targetHandle: z.string().max(30).optional(),
  startDate: z.string().max(30).optional(),
  endDate: z.string().max(30).optional(),
  notes: z.string().max(20_000).optional(),
  status: z.enum(["married", "partnered", "divorced", "separated", "widowed", "custom"]).optional(),
});

export const treeDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    tree: z.object({
      id: z.string().min(1).max(100),
      name: z.string().min(1).max(180),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
    people: z.array(personSchema).max(50_000),
    relationships: z.array(relationshipSchema).max(200_000),
    settings: z.object({
      accent: z.string().max(30),
      edgeColors: z.record(relationshipType, z.string().max(30)),
      cardShape: z.enum(["rectangle", "oval", "square"]).default("rectangle"),
      showPhotos: z.boolean().default(true),
      showDates: z.boolean().default(true),
      showMiniMap: z.boolean().default(true),
      edgeWidth: z.enum(["thin", "medium", "bold"]).default("medium"),
    }),
  })
  .superRefine((doc, ctx) => {
    const ids = new Set(doc.people.map((person) => person.id));
    const keys = new Set<string>();
    for (const relationship of doc.relationships) {
      if (!ids.has(relationship.sourcePersonId) || !ids.has(relationship.targetPersonId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Relationship references a missing person" });
      }
      if (relationship.sourcePersonId === relationship.targetPersonId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Self relationships are not allowed" });
      }
      const symmetric = relationship.type === "spouse" || relationship.type === "partner";
      const ends = symmetric
        ? [relationship.sourcePersonId, relationship.targetPersonId].sort().join(":")
        : `${relationship.sourcePersonId}:${relationship.targetPersonId}`;
      const key = `${relationship.type}:${ends}`;
      if (keys.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate relationship" });
      keys.add(key);
    }
  });
