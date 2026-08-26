import type { Person, TreeDocument } from "./types";

type Individual = Partial<Person> & { id: string; displayName: string };
type Family = { spouses: string[]; children: string[] };

export function parseGedcom(text: string, base: TreeDocument): TreeDocument {
  const individuals = new Map<string, Individual>();
  const families: Family[] = [];
  let currentPerson: Individual | null = null;
  let currentFamily: Family | null = null;
  let event: "birth" | "death" | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const individual = line.match(/^0\s+@([^@]+)@\s+INDI$/);
    const family = line.match(/^0\s+@[^@]+@\s+FAM$/);
    if (individual) { currentPerson = { id: individual[1], displayName: "Unknown" }; individuals.set(individual[1], currentPerson); currentFamily = null; event = null; continue; }
    if (family) { currentFamily = { spouses: [], children: [] }; families.push(currentFamily); currentPerson = null; event = null; continue; }
    if (currentPerson) {
      const name = line.match(/^1\s+NAME\s+(.+)$/)?.[1]?.replaceAll("/", "").trim();
      const sex = line.match(/^1\s+SEX\s+([MF])$/)?.[1];
      if (name) currentPerson.displayName = name;
      if (sex) currentPerson.gender = sex === "M" ? "male" : "female";
      if (/^1\s+BIRT/.test(line)) event = "birth";
      if (/^1\s+DEAT/.test(line)) event = "death";
      const date = line.match(/^2\s+DATE\s+(.+)$/)?.[1];
      const place = line.match(/^2\s+PLAC\s+(.+)$/)?.[1];
      if (date && event === "birth") currentPerson.birthDate = date;
      if (date && event === "death") currentPerson.deathDate = date;
      if (place && event === "birth") currentPerson.birthPlace = place;
      if (place && event === "death") currentPerson.deathPlace = place;
    }
    if (currentFamily) {
      const spouse = line.match(/^1\s+(?:HUSB|WIFE)\s+@([^@]+)@$/)?.[1];
      const child = line.match(/^1\s+CHIL\s+@([^@]+)@$/)?.[1];
      if (spouse) currentFamily.spouses.push(spouse);
      if (child) currentFamily.children.push(child);
    }
  }
  const now = new Date().toISOString();
  const idMap = new Map<string, string>();
  const people = [...individuals.values()].map((item, index) => {
    const id = crypto.randomUUID(); idMap.set(item.id, id);
    return { ...item, id, treeId: base.tree.id, x: 180 + (index % 5) * 290, y: 180 + Math.floor(index / 5) * 210, createdAt: now, updatedAt: now } as Person;
  });
  const relationships: TreeDocument["relationships"] = [];
  for (const family of families) {
    const spouses = family.spouses.map((id) => idMap.get(id)).filter(Boolean) as string[];
    if (spouses.length >= 2) relationships.push({ id: crypto.randomUUID(), treeId: base.tree.id, sourcePersonId: spouses[0], targetPersonId: spouses[1], type: "spouse" });
    for (const childRef of family.children) {
      const child = idMap.get(childRef); if (!child) continue;
      spouses.forEach((parent) => relationships.push({ id: crypto.randomUUID(), treeId: base.tree.id, sourcePersonId: parent, targetPersonId: child, type: "parent" }));
    }
  }
  return { ...base, tree: { ...base.tree, updatedAt: now }, people, relationships };
}

export function toGedcom(document: TreeDocument) {
  const refs = new Map(document.people.map((person, index) => [person.id, `I${index + 1}`]));
  const lines = ["0 HEAD", "1 SOUR MIRAS", "1 GEDC", "2 VERS 5.5.1", "1 CHAR UTF-8"];
  document.people.forEach((person) => {
    lines.push(`0 @${refs.get(person.id)}@ INDI`, `1 NAME ${person.displayName}`, `1 SEX ${person.gender === "female" ? "F" : "M"}`);
    if (person.birthDate || person.birthPlace) { lines.push("1 BIRT"); if (person.birthDate) lines.push(`2 DATE ${person.birthDate}`); if (person.birthPlace) lines.push(`2 PLAC ${person.birthPlace}`); }
    if (person.deathDate || person.deathPlace) { lines.push("1 DEAT"); if (person.deathDate) lines.push(`2 DATE ${person.deathDate}`); if (person.deathPlace) lines.push(`2 PLAC ${person.deathPlace}`); }
  });
  const romantic = document.relationships.filter((rel) => rel.type === "spouse" || rel.type === "partner");
  romantic.forEach((rel, index) => {
    lines.push(`0 @F${index + 1}@ FAM`, `1 HUSB @${refs.get(rel.sourcePersonId)}@`, `1 WIFE @${refs.get(rel.targetPersonId)}@`);
    const children = document.relationships.filter((candidate) => candidate.type === "parent" && candidate.sourcePersonId === rel.sourcePersonId && document.relationships.some((other) => other.type === "parent" && other.sourcePersonId === rel.targetPersonId && other.targetPersonId === candidate.targetPersonId));
    children.forEach((child) => lines.push(`1 CHIL @${refs.get(child.targetPersonId)}@`));
  });
  lines.push("0 TRLR");
  return lines.join("\n");
}
