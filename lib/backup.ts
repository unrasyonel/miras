import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import type { TreeDocument } from "./types";

const PHOTO_PREFIX = "miras://";

function decodeDataUrl(value: string) {
  const match = value.match(/^data:(image\/webp);base64,(.+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeDataUrl(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:image/webp;base64,${btoa(binary)}`;
}

export function createMirasBackup(document: TreeDocument) {
  const archived = structuredClone(document);
  const files: Zippable = {};
  for (const person of archived.people) {
    if (!person.photoUrl) continue;
    const photo = decodeDataUrl(person.photoUrl);
    if (!photo) continue;
    const path = `images/${person.id}.webp`;
    files[path] = [photo, { level: 0 }];
    person.photoUrl = `${PHOTO_PREFIX}${path}`;
  }
  files["tree.json"] = strToU8(JSON.stringify(archived));
  return zipSync(files, { level: 6 });
}

export function readMirasBackup(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  const treeFile = files["tree.json"];
  if (!treeFile) throw new Error("Missing tree.json");
  const document = JSON.parse(strFromU8(treeFile)) as TreeDocument;
  for (const person of document.people) {
    if (!person.photoUrl?.startsWith(PHOTO_PREFIX)) continue;
    const photo = files[person.photoUrl.slice(PHOTO_PREFIX.length)];
    if (!photo) throw new Error(`Missing photo for ${person.id}`);
    person.photoUrl = encodeDataUrl(photo);
  }
  return document;
}
