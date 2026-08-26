import { beforeEach, describe, expect, it } from "vitest";
import { demoDocument } from "./demo";
import { useTreeStore } from "./store";

beforeEach(() => {
  useTreeStore.setState({
    document: structuredClone(demoDocument),
    selectedPersonId: null,
    saveStatus: "saved",
    hydrated: true,
    history: { past: [], future: [] },
  });
});

describe("family tree store", () => {
  it("creates and edits a person", () => {
    const id = useTreeStore.getState().addPerson("Ayşe Durmuş", { x: 10, y: 20 });
    useTreeStore.getState().updatePerson(id, { location: "Ankara" });
    expect(useTreeStore.getState().document.people.find((person) => person.id === id)).toMatchObject({
      displayName: "Ayşe Durmuş",
      location: "Ankara",
      x: 10,
      y: 20,
    });
  });

  it("removes a person and all attached relationships", () => {
    const first = useTreeStore.getState().addPerson("First");
    const second = useTreeStore.getState().addPerson("Second");
    useTreeStore.getState().addRelationship(first, second, "parent");
    useTreeStore.getState().deletePerson(first);
    const state = useTreeStore.getState();
    expect(state.document.people.some((person) => person.id === first)).toBe(false);
    expect(state.document.relationships.some((rel) => rel.sourcePersonId === first || rel.targetPersonId === first)).toBe(false);
  });

  it("prevents duplicate and self relationships", () => {
    const first = useTreeStore.getState().addPerson("First");
    const second = useTreeStore.getState().addPerson("Second");
    expect(useTreeStore.getState().addRelationship(first, second, "spouse")).toBe(true);
    expect(useTreeStore.getState().addRelationship(first, first, "parent")).toBe(false);
    expect(useTreeStore.getState().addRelationship(second, first, "spouse")).toBe(false);
  });

  it("supports undo and redo", () => {
    const before = useTreeStore.getState().document.people.length;
    useTreeStore.getState().addPerson("Test kişi");
    useTreeStore.getState().undo();
    expect(useTreeStore.getState().document.people).toHaveLength(before);
    useTreeStore.getState().redo();
    expect(useTreeStore.getState().document.people).toHaveLength(before + 1);
  });

  it("inherits a shared parent city when the second parent is linked", () => {
    const firstParent = useTreeStore.getState().addPerson("Anne");
    const secondParent = useTreeStore.getState().addPerson("Baba");
    const child = useTreeStore.getState().addPerson("Çocuk");
    useTreeStore.getState().updatePerson(firstParent, { location: "Yakutiye, Erzurum, Türkiye" });
    useTreeStore.getState().updatePerson(secondParent, { location: "Palandöken, Erzurum, Türkiye" });
    useTreeStore.getState().addRelationship(firstParent, child, "parent");
    useTreeStore.getState().addRelationship(secondParent, child, "parent");
    expect(useTreeStore.getState().document.people.find((person) => person.id === child)?.location).toBe("Erzurum, Türkiye");
  });
});
