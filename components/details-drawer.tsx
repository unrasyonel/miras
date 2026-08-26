"use client";

import { useState } from "react";
import { Camera, ChevronRight, Link2, MapPinned, Pencil, Plus, Trash2, User, UserRound, X } from "lucide-react";
import { useTreeStore } from "@/lib/store";
import { messages, type Locale } from "@/lib/i18n";
import type { Person, RelationshipType } from "@/lib/types";
import { LocationField } from "@/components/location-field";
import { confirmDialog } from "@/lib/dialog-store";
import { inferGender } from "@/lib/gender";

function Field({ label, value, placeholder, disabled, list, onCommit }: { label: string; value?: string; placeholder?: string; disabled: boolean; list?: string; onCommit: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input key={value} defaultValue={value ?? ""} placeholder={placeholder} disabled={disabled} list={list} onBlur={(event) => onCommit(event.target.value)} />
    </label>
  );
}

export function DetailsDrawer({ locale }: { locale: Locale }) {
  const copy = messages[locale];
  const document = useTreeStore((state) => state.document);
  const selectedId = useTreeStore((state) => state.selectedPersonId);
  const mode = useTreeStore((state) => state.selectedPersonMode);
  const selectPerson = useTreeStore((state) => state.selectPerson);
  const updatePerson = useTreeStore((state) => state.updatePerson);
  const deletePerson = useTreeStore((state) => state.deletePerson);
  const addPerson = useTreeStore((state) => state.addPerson);
  const addRelationship = useTreeStore((state) => state.addRelationship);
  const deleteRelationship = useTreeStore((state) => state.deleteRelationship);
  const [relationName, setRelationName] = useState("");
  const [relationType, setRelationType] = useState<RelationshipType>("parent");
  const [relationError, setRelationError] = useState("");
  const [passedAwayIds, setPassedAwayIds] = useState<Set<string>>(() => new Set());
  const person = document.people.find((item) => item.id === selectedId);
  const editing = mode === "edit";

  if (!person) return null;

  const relationshipLabels: Record<RelationshipType, string> = {
    parent: copy.parentChild,
    spouse: copy.spouse,
    partner: copy.partner,
    "adoptive-parent": copy.adoptiveParent,
    "step-parent": copy.stepParent,
    guardian: copy.guardian,
    other: copy.other,
  };
  const relationships = document.relationships.filter((rel) => rel.sourcePersonId === person.id || rel.targetPersonId === person.id);
  const passedAway = Boolean(person.deathDate || person.deathPlace || passedAwayIds.has(person.id));
  const relatedPerson = (source: string, target: string) => document.people.find((item) => item.id === (source === person.id ? target : source));
  const commit = (patch: Partial<Person>) => editing && updatePerson(person.id, patch);
  const createRelation = () => {
    const name = relationName.trim();
    if (!name) return;
    let target = document.people.find((item) => item.displayName.toLocaleLowerCase(locale) === name.toLocaleLowerCase(locale));
    if (!target) {
      const id = addPerson(name, { x: person.x + 310, y: relationType === "parent" ? person.y + 250 : person.y });
      target = useTreeStore.getState().document.people.find((item) => item.id === id);
    }
    if (!target || !addRelationship(person.id, target.id, relationType)) {
      setRelationError(copy.relationshipInvalid);
      return;
    }
    selectPerson(person.id, "edit");
    setRelationName("");
    setRelationError("");
  };

  const addPhoto = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        updatePerson(person.id, { photoUrl: canvas.toDataURL("image/webp", .82) });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const panel = (
    <aside className={editing ? "edit-dialog" : "details-drawer"} aria-label={`${person.displayName} ${copy.profile}`}>
      <header className="drawer-header">
        <div><span>{copy.personProfile}</span><h2>{person.displayName}</h2></div>
        <div className="drawer-header-actions">
          {!editing && <button className="icon-button" type="button" onClick={() => selectPerson(person.id, "edit")} aria-label={copy.edit}><Pencil size={17} /></button>}
          <button className="icon-button" type="button" onClick={() => selectPerson(null)} aria-label={copy.close}><X size={19} /></button>
        </div>
      </header>
      <div className="drawer-scroll">
        <section className="drawer-section">
          <h3>{copy.profile}</h3>
          <Field label={copy.fullName} value={person.displayName} disabled={!editing} onCommit={(displayName) => { const clean = displayName.trim(); if (clean) commit({ displayName: clean, gender: inferGender(clean) ?? person.gender }); }} />
          <div className="field-row">
            <Field label={copy.nickname} value={person.nickname} placeholder={copy.optional} disabled={!editing} onCommit={(nickname) => commit({ nickname })} />
            <div className="field"><span>{copy.gender}</span><div className="gender-options"><button className={person.gender === "male" ? "active male" : "male"} type="button" disabled={!editing} aria-label={copy.male} onClick={() => commit({ gender: "male" })}><User size={18} /></button><button className={person.gender === "female" ? "active female" : "female"} type="button" disabled={!editing} aria-label={copy.female} onClick={() => commit({ gender: "female" })}><UserRound size={18} /></button></div></div>
          </div>
          <div className="field-row">
            <Field label={copy.birth} value={person.birthDate} placeholder="YYYY-MM-DD" disabled={!editing} onCommit={(birthDate) => commit({ birthDate })} />
            <LocationField label={copy.birthPlace} value={person.birthPlace} disabled={!editing} locale={locale} onCommit={(birthPlace) => commit({ birthPlace })} />
          </div>
          {editing && <button className={`passed-away-toggle ${passedAway ? "active" : ""}`} type="button" onClick={() => { if (passedAway) { commit({ deathDate: "", deathPlace: "" }); setPassedAwayIds((ids) => { const next = new Set(ids); next.delete(person.id); return next; }); } else setPassedAwayIds((ids) => new Set(ids).add(person.id)); }}>{copy.passedAway}</button>}
          {passedAway && <div className="field-row"><Field label={copy.death} value={person.deathDate} placeholder="YYYY-MM-DD" disabled={!editing} onCommit={(deathDate) => commit({ deathDate })} /><LocationField label={copy.deathPlace} value={person.deathPlace} disabled={!editing} locale={locale} onCommit={(deathPlace) => commit({ deathPlace })} /></div>}
          <LocationField label={copy.location} value={person.location} placeholder={copy.cityCountry} disabled={!editing} locale={locale} onCommit={(location) => commit({ location })} />
          {!editing && person.location && <a className="map-link" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(person.location)}`} target="_blank" rel="noreferrer"><MapPinned size={15} />{copy.locationMap}</a>}
        </section>

        {editing && <section className="drawer-section photo-section"><div><h3>{copy.photo}</h3><p>{copy.photoHelp}</p>{person.photoUrl && <button className="remove-photo" type="button" onClick={() => commit({ photoUrl: "" })}>{copy.removePhoto}</button>}</div><label className="photo-upload"><span className={person.photoUrl ? "has-photo" : ""} style={person.photoUrl ? { backgroundImage: `url(${person.photoUrl})` } : undefined}>{!person.photoUrl && <Camera size={22} />}</span><strong>{copy.addPhoto}</strong><input type="file" accept="image/*" hidden onChange={(event) => addPhoto(event.target.files?.[0])} /></label></section>}

        <section className="drawer-section">
          <div className="section-title"><div><h3>{copy.relationships}</h3>{editing && <p>{copy.relationshipHelp}</p>}</div><Link2 size={18} /></div>
          {editing && (
            <div className="relationship-add">
              <select value={relationType} onChange={(event) => setRelationType(event.target.value as RelationshipType)} aria-label={copy.relationship}>
                {Object.entries(relationshipLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <div className="relationship-search">
                <input list="people-list" value={relationName} placeholder={copy.searchPeople} onChange={(event) => setRelationName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createRelation()} />
                <datalist id="people-list">{document.people.filter((item) => item.id !== person.id).map((item) => <option key={item.id} value={item.displayName} />)}</datalist>
                <button type="button" onClick={createRelation} aria-label={copy.addRelationship}><Plus size={17} /></button>
              </div>
              {relationError && <p className="field-error">{relationError}</p>}
            </div>
          )}
          <div className="relationship-list">
            {relationships.length === 0 && <p className="empty-copy">{copy.noRelationships}</p>}
            {relationships.map((relationship) => {
              const other = relatedPerson(relationship.sourcePersonId, relationship.targetPersonId);
              return (
                <div className="relationship-item" key={relationship.id}>
                  <button type="button" onClick={() => other && selectPerson(other.id, "view")}>
                    <span>{relationshipLabels[relationship.type]}</span><strong>{other?.displayName ?? copy.unknownPerson}</strong><ChevronRight size={16} />
                  </button>
                  {editing && <button type="button" aria-label={copy.delete} onClick={() => deleteRelationship(relationship.id)}><X size={15} /></button>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="drawer-section">
          <h3>{copy.notes}</h3>
          <textarea className="notes-area" defaultValue={person.notes} placeholder={copy.notesPlaceholder} disabled={!editing} onBlur={(event) => commit({ notes: event.target.value })} />
        </section>

        {editing && <button className="danger-button" type="button" onClick={() => {
          void confirmDialog(copy.confirmDelete).then((accepted) => accepted && deletePerson(person.id));
        }}><Trash2 size={16} /> {copy.deletePerson}</button>}
      </div>
    </aside>
  );
  return editing ? <div className="modal-backdrop edit-backdrop" onMouseDown={(event) => event.target === event.currentTarget && selectPerson(null)}>{panel}</div> : panel;
}
