"use client";

import { memo, useState, type CSSProperties } from "react";
import { Handle, Position, useStore, type NodeProps, type Node } from "@xyflow/react";
import { Baby, Eye, Heart, MapPin, Pencil, Trash2, UserRound, UserRoundPlus, UsersRound } from "lucide-react";
import { useTreeStore } from "@/lib/store";
import { messages, type Locale } from "@/lib/i18n";
import { confirmDialog } from "@/lib/dialog-store";

export type PersonNodeData = {
  personId: string;
  name: string;
  nickname?: string;
  years: string;
  location?: string;
  photoUrl?: string;
  cardShape: "rectangle" | "oval" | "square";
  showPhotos: boolean;
  showDates: boolean;
  x: number;
  y: number;
  locale: Locale;
};

export type PersonFlowNode = Node<PersonNodeData, "person">;

export const PersonNode = memo(function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const [addOpen, setAddOpen] = useState(false);
  const zoom = useStore((state) => state.transform[2]);
  const selectedCount = useStore((state) => state.nodes.filter((node) => node.selected).length);
  const selectPerson = useTreeStore((state) => state.selectPerson);
  const addPerson = useTreeStore((state) => state.addPerson);
  const addRelationship = useTreeStore((state) => state.addRelationship);
  const deletePerson = useTreeStore((state) => state.deletePerson);
  const copy = messages[data.locale];
  const initials = data.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase(data.locale === "tr" ? "tr-TR" : "en-US");

  const addRelative = (kind: "parent" | "spouse" | "child") => {
    const position = kind === "parent"
      ? { x: data.x, y: data.y - 230 }
      : kind === "spouse"
        ? { x: data.x + 310, y: data.y }
        : { x: data.x, y: data.y + 240 };
    const name = kind === "parent" ? copy.newParent : kind === "spouse" ? copy.newSpouse : copy.newChild;
    const relativeId = addPerson(name, position);
    if (kind === "parent") addRelationship(relativeId, data.personId, "parent");
    if (kind === "spouse") addRelationship(data.personId, relativeId, "spouse");
    if (kind === "child") addRelationship(data.personId, relativeId, "parent");
    selectPerson(relativeId, "edit");
    setAddOpen(false);
  };

  return (
    <article className={`person-card shape-${data.cardShape} ${data.showPhotos ? "" : "no-photo"} ${data.showDates ? "" : "no-dates"} ${selected ? "is-selected" : ""}`} aria-label={data.name} onClick={(event) => { if (event.detail >= 2) { event.stopPropagation(); selectPerson(data.personId, "edit"); } }} onDoubleClick={(event) => { event.stopPropagation(); selectPerson(data.personId, "edit"); }}>
      <Handle id="top" type="source" position={Position.Top} className="node-handle" />
      <Handle id="right" type="source" position={Position.Right} className="node-handle" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle" />
      <Handle id="left" type="source" position={Position.Left} className="node-handle" />

      {data.showPhotos && <div className={`person-avatar ${data.photoUrl ? "has-photo" : ""}`} style={data.photoUrl ? { backgroundImage: `url(${data.photoUrl})` } : undefined} aria-hidden="true">{!data.photoUrl && (initials || <UserRound size={18} />)}</div>}
      <div className="person-copy">
        <strong>{data.name}</strong>
        {data.nickname && <span className="person-nickname">“{data.nickname}”</span>}
        {data.showDates && <span>{data.years || copy.dateMissing}</span>}
        {data.location && <span className="person-location"><MapPin size={11} />{data.location}</span>}
      </div>

      {selected && selectedCount === 1 && (
        <div className="person-actions nodrag nopan" style={{ "--action-scale": 1 / zoom } as CSSProperties} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => selectPerson(data.personId, "view")}><Eye size={14} /><span>{copy.view}</span></button>
          <button type="button" onClick={() => selectPerson(data.personId, "edit")}><Pencil size={14} /><span>{copy.edit}</span></button>
          <div className="person-add-wrap">
            <button type="button" onClick={() => setAddOpen((open) => !open)}><UserRoundPlus size={14} /><span>{copy.add}</span></button>
            {addOpen && (
              <div className="person-add-menu">
                <button type="button" onClick={() => addRelative("parent")}><UsersRound size={14} />{copy.parent}</button>
                <button type="button" onClick={() => addRelative("spouse")}><Heart size={14} />{copy.spouse}</button>
                <button type="button" onClick={() => addRelative("child")}><Baby size={14} />{copy.child}</button>
              </div>
            )}
          </div>
          <button className="delete" type="button" aria-label={copy.delete} onClick={() => {
            void confirmDialog(copy.confirmDelete).then((accepted) => accepted && deletePerson(data.personId));
          }}><Trash2 size={14} /><span>{copy.delete}</span></button>
        </div>
      )}
    </article>
  );
});
