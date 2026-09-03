"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ViewportPortal,
  type Connection,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import {
  Check,
  ChevronRight,
  Download,
  HeartHandshake,
  Import,
  Info,
  Menu,
  Moon,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Sun,
  Undo2,
  WifiOff,
  X,
  Scan,
  Settings,
  Languages,
  Hand,
  MousePointer2,
  Share2,
  CalendarDays,
  Image as ImageIcon,
  Map as MapIcon,
  Eye,
  Pencil,
  Github,
  ArchiveRestore,
  FileJson,
} from "lucide-react";
import { SignatureIntro } from "./signature-intro";
import { PersonNode, type PersonFlowNode } from "./person-node";
import { DetailsDrawer } from "./details-drawer";
import { RelationshipEdge, type RelationshipEdgeData, type RelationshipFlowEdge } from "./relationship-edge";
import { loadLocalDocument, saveLocalDocument } from "@/lib/db";
import { demoDocument } from "@/lib/demo";
import { messages, type Locale } from "@/lib/i18n";
import { treeDocumentSchema } from "@/lib/schema";
import { parseGedcom, toGedcom } from "@/lib/gedcom";
import { useTreeStore } from "@/lib/store";
import type { RelationshipType, SaveStatus, TreeDocument } from "@/lib/types";
import { familyGeometry } from "@/lib/family-layout";
import { cardDimensions } from "@/lib/card-layout";
import { canvasInteraction } from "@/lib/canvas-interaction";

const touchQuery = "(pointer: coarse)";
const subscribeTouch = (notify: () => void) => {
  const query = window.matchMedia(touchQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const getTouchSnapshot = () => window.matchMedia(touchQuery).matches;
const getServerTouchSnapshot = () => false;
import { createMirasBackup, readMirasBackup } from "@/lib/backup";
import { confirmDialog, noticeDialog } from "@/lib/dialog-store";
import { AppDialog } from "./app-dialog";
import { EmptyTreeState } from "./empty-tree-state";

const nodeTypes: NodeTypes = { person: PersonNode };
const edgeTypes: EdgeTypes = { relationship: RelationshipEdge };

function years(birth?: string, death?: string) {
  if (!birth && !death) return "";
  return `${birth || "?"} — ${death || ""}`;
}

function handlesBetween(source: { x: number; y: number }, target: { x: number; y: number }, type: RelationshipType, cardShape: TreeDocument["settings"]["cardShape"] = "rectangle") {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (type === "spouse" || type === "partner") {
    return { sourceHandle: dx >= 0 ? "right" : "left", targetHandle: dx >= 0 ? "left" : "right" };
  }
  if (cardShape === "square" && ["parent", "adoptive-parent", "step-parent", "guardian"].includes(type) && Math.abs(dy) - cardDimensions.square.height < 56) {
    const side = dx < 0 ? "left" : "right";
    return { sourceHandle: side, targetHandle: side };
  }
  if (["parent", "adoptive-parent", "step-parent", "guardian"].includes(type) && Math.abs(dx) < Math.max(380, Math.abs(dy) * 2.1)) {
    return { sourceHandle: dy >= 0 ? "bottom" : "top", targetHandle: dy >= 0 ? "top" : "bottom" };
  }
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  return horizontal
    ? { sourceHandle: dx >= 0 ? "right" : "left", targetHandle: dx >= 0 ? "left" : "right" }
    : { sourceHandle: dy >= 0 ? "bottom" : "top", targetHandle: dy >= 0 ? "top" : "bottom" };
}

function Canvas({ locale, interactionMode }: { locale: Locale; interactionMode: "select" | "drag" }) {
  const touch = useSyncExternalStore(subscribeTouch, getTouchSnapshot, getServerTouchSnapshot);
  const copy = messages[locale];
  const document = useTreeStore((state) => state.document);
  const drawerPersonId = useTreeStore((state) => state.selectedPersonId);
  const selectPerson = useTreeStore((state) => state.selectPerson);
  const movePerson = useTreeStore((state) => state.movePerson);
  const setPositions = useTreeStore((state) => state.setPositions);
  const addRelationship = useTreeStore((state) => state.addRelationship);
  const deletePerson = useTreeStore((state) => state.deletePerson);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const { getNode, getNodes, setCenter, zoomIn, zoomOut, fitView } = useReactFlow();

  const flowNodes = useMemo<PersonFlowNode[]>(() => document.people.map((person) => ({
    id: person.id,
    type: "person",
    position: { x: person.x, y: person.y },
    selected: person.id === activeNodeId,
    data: {
      personId: person.id,
      name: person.displayName,
      nickname: person.nickname,
      years: years(person.birthDate, person.deathDate),
      location: person.location || person.birthPlace,
      photoUrl: person.photoUrl,
      cardShape: document.settings.cardShape ?? "rectangle",
      showPhotos: document.settings.showPhotos ?? true,
      showDates: document.settings.showDates ?? true,
      x: person.x,
      y: person.y,
      locale,
    },
  })), [activeNodeId, document.people, document.settings.cardShape, document.settings.showDates, document.settings.showPhotos, locale]);

  const flowEdges = useMemo<RelationshipFlowEdge[]>(() => document.relationships.flatMap((relationship) => {
    const source = document.people.find((person) => person.id === relationship.sourcePersonId);
    const target = document.people.find((person) => person.id === relationship.targetPersonId);
    let familyData: Partial<Pick<RelationshipEdgeData, "originX" | "originY" | "junctionY" | "familyParentIds" | "obstacles">> = {};
    if (["parent", "adoptive-parent", "step-parent", "guardian"].includes(relationship.type)) {
      const coParentRelation = document.relationships.find((candidate) => candidate.id !== relationship.id && candidate.targetPersonId === relationship.targetPersonId && ["parent", "adoptive-parent", "step-parent", "guardian"].includes(candidate.type));
      if (coParentRelation) {
        if (relationship.id > coParentRelation.id) return [];
        const coParent = document.people.find((person) => person.id === coParentRelation.sourcePersonId);
        if (source && coParent) {
          const { width, height } = cardDimensions[document.settings.cardShape ?? "rectangle"];
          const parentIds = [source.id, coParent.id];
          const childTopPositions = document.people
            .filter((person) => parentIds.every((parentId) => document.relationships.some((candidate) => candidate.sourcePersonId === parentId && candidate.targetPersonId === person.id && ["parent", "adoptive-parent", "step-parent", "guardian"].includes(candidate.type))))
            .map((person) => person.y);
          familyData = { ...familyGeometry(source, coParent, childTopPositions, width, height), familyParentIds: parentIds };
        }
      }
    }
    if (familyData.familyParentIds && target) {
      const { width, height } = cardDimensions[document.settings.cardShape ?? "rectangle"];
      familyData.obstacles = document.people
        .filter((person) => person.id !== target.id && !familyData.familyParentIds!.includes(person.id))
        .map((person) => ({ x: person.x, y: person.y, width, height }));
    }
    const handles = handlesBetween(source ?? { x: 0, y: 0 }, target ?? { x: 0, y: 0 }, relationship.type, document.settings.cardShape);
    return [{
    id: relationship.id,
    source: relationship.sourcePersonId,
    target: relationship.targetPersonId,
    sourceHandle: familyData.originX !== undefined ? "bottom" : handles.sourceHandle,
    targetHandle: familyData.originX !== undefined ? "top" : handles.targetHandle,
    type: "relationship",
    data: {
      relationshipId: relationship.id,
      relationshipType: relationship.type,
      color: relationship.color || document.settings.edgeColors[relationship.type],
      locale,
      ...familyData,
      edgeWidth: document.settings.edgeWidth ?? "medium",
    },
  }]; }), [document.people, document.relationships, document.settings.cardShape, document.settings.edgeColors, document.settings.edgeWidth, locale]);

  const [nodes, setNodes, onNodesChange] = useNodesState<PersonFlowNode>(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipFlowEdge>(flowEdges);
  useEffect(() => setNodes(flowNodes), [flowNodes, setNodes]);
  useEffect(() => setEdges(flowEdges), [flowEdges, setEdges]);
  useEffect(() => {
    if (!drawerPersonId) return;
    const selected = getNode(drawerPersonId);
    if (selected) setCenter(selected.position.x + 120, selected.position.y + 48, { zoom: 1, duration: 500 });
  }, [drawerPersonId, getNode, setCenter]);
  useEffect(() => {
    const onDelete = (event: KeyboardEvent) => {
      if (!activeNodeId || !["Delete", "Backspace"].includes(event.key) || (event.target as HTMLElement).matches("input, textarea, select")) return;
      event.preventDefault();
      void confirmDialog(copy.confirmDelete).then((accepted) => {
        if (accepted) { deletePerson(activeNodeId); setActiveNodeId(null); }
      });
    };
    window.addEventListener("keydown", onDelete);
    return () => window.removeEventListener("keydown", onDelete);
  }, [activeNodeId, copy.confirmDelete, deletePerson]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    addRelationship(connection.source, connection.target, "parent", {
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    });
  }, [addRelationship]);

  return (
    <div className="canvas-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => { setActiveNodeId(node.id); selectPerson(null); }}
        onNodeDoubleClick={(_, node) => selectPerson(node.id, "edit")}
        onPaneClick={() => { setActiveNodeId(null); selectPerson(null); }}
        onNodeDrag={(_, dragged) => {
          const currentNodes = getNodes();
          const movingIds = new Set(currentNodes.filter((node) => node.selected).map((node) => node.id));
          movingIds.add(dragged.id);
          const others = currentNodes.filter((node) => !movingIds.has(node.id));
          const closest = (axis: "x" | "y") => others
            .map((node) => ({ node, distance: Math.abs(node.position[axis] - dragged.position[axis]) }))
            .filter(({ distance }) => distance <= 18)
            .sort((first, second) => first.distance - second.distance)[0]?.node;
          const nearX = movingIds.size === 1 ? closest("x") : undefined;
          const nearY = movingIds.size === 1 ? closest("y") : undefined;
          if (nearX) dragged.position.x = nearX.position.x;
          if (nearY) dragged.position.y = nearY.position.y;
          setGuides({ x: nearX?.position.x, y: nearY?.position.y });
          setEdges((current) => current.map((edge) => {
            const edgeData = edge.data;
            if (!edgeData) return edge;
            const familyIds = edgeData.familyParentIds;
            if (familyIds?.includes(dragged.id)) {
              const parents = familyIds.map((id) => id === dragged.id ? dragged : currentNodes.find((node) => node.id === id)).filter(Boolean) as PersonFlowNode[];
              if (parents.length === 2) {
                const { width, height } = cardDimensions[document.settings.cardShape ?? "rectangle"];
                const childTopPositions = current
                  .filter((candidate) => candidate.data?.familyParentIds?.length === 2 && familyIds.every((id) => candidate.data?.familyParentIds?.includes(id)))
                  .map((candidate) => candidate.target === dragged.id ? dragged.position.y : currentNodes.find((node) => node.id === candidate.target)?.position.y)
                  .filter((position): position is number => position !== undefined);
                return { ...edge, data: { ...edgeData, ...familyGeometry(parents[0].position, parents[1].position, childTopPositions, width, height) } };
              }
            }
            if (edge.source !== dragged.id && edge.target !== dragged.id) return edge;
            const otherId = edge.source === dragged.id ? edge.target : edge.source;
            const other = currentNodes.find((node) => node.id === otherId);
            if (!other) return edge;
            const source = edge.source === dragged.id ? dragged.position : other.position;
            const target = edge.target === dragged.id ? dragged.position : other.position;
            return { ...edge, ...handlesBetween(source, target, edge.data?.relationshipType ?? "other", document.settings.cardShape) };
          }));
        }}
        onNodeDragStop={(_, node) => {
          setGuides({});
          if (interactionMode === "select") {
            const selected = getNodes().filter((item) => item.selected || item.id === node.id);
            const positions = Object.fromEntries(selected.map((item) => [item.id, { ...item.position }]));
            const selectedIds = new Set(selected.map((item) => item.id));
            document.relationships.filter((relationship) => relationship.type === "spouse" || relationship.type === "partner").forEach((relationship) => {
              if (!selectedIds.has(relationship.sourcePersonId) || !selectedIds.has(relationship.targetPersonId)) return;
              const beforeSource = document.people.find((person) => person.id === relationship.sourcePersonId);
              const beforeTarget = document.people.find((person) => person.id === relationship.targetPersonId);
              if (beforeSource && beforeTarget && Math.abs(beforeSource.y - beforeTarget.y) < 1) positions[relationship.targetPersonId].y = positions[relationship.sourcePersonId].y;
            });
            setPositions(positions);
          } else movePerson(node.id, node.position.x, node.position.y);
        }}
        nodesDraggable
        elementsSelectable
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.18}
        maxZoom={2.4}
        connectionMode={ConnectionMode.Loose}
        {...canvasInteraction(interactionMode, touch)}
        selectionMode={SelectionMode.Partial}
        panOnScroll
        panOnScrollSpeed={0.72}
        zoomOnScroll
        onlyRenderVisibleElements={document.people.length > 140}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.1} />
        {document.people.length > 0 && (document.settings.showMiniMap ?? true) && <MiniMap position="bottom-left" pannable zoomable nodeColor="var(--md-primary)" maskColor="color-mix(in srgb, var(--md-surface) 76%, transparent)" />}
        <ViewportPortal>{guides.x !== undefined && <div className="alignment-guide vertical" style={{ left: guides.x }} />}{guides.y !== undefined && <div className="alignment-guide horizontal" style={{ top: guides.y }} />}</ViewportPortal>
      </ReactFlow>
      <div className="smooth-controls" aria-label="Canvas controls">
        <button type="button" onClick={() => zoomIn({ duration: 520 })} aria-label="Zoom in"><Plus size={18} /></button>
        <button type="button" onClick={() => zoomOut({ duration: 520 })} aria-label="Zoom out"><span>−</span></button>
        <button type="button" onClick={() => fitView({ padding: .22, duration: 650 })} aria-label="Realign"><Scan size={18} /></button>
      </div>

      {document.people.length === 0 && <EmptyTreeState locale={locale} />}
    </div>
  );
}

function downloadUrl(url: string, filename: string) {
  const anchor = Object.assign(window.document.createElement("a"), { href: url, download: filename });
  anchor.click();
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

function EditorShell() {
  const [locale, setLocale] = useState<Locale>("en");
  const copy = messages[locale];
  const document = useTreeStore((state) => state.document);
  const hydrated = useTreeStore((state) => state.hydrated);
  const saveStatus = useTreeStore((state) => state.saveStatus);
  const setHydrated = useTreeStore((state) => state.setHydrated);
  const setSaveStatus = useTreeStore((state) => state.setSaveStatus);
  const selectPerson = useTreeStore((state) => state.selectPerson);
  const addPerson = useTreeStore((state) => state.addPerson);
  const replaceDocument = useTreeStore((state) => state.replaceDocument);
  const updateSettings = useTreeStore((state) => state.updateSettings);
  const undo = useTreeStore((state) => state.undo);
  const redo = useTreeStore((state) => state.redo);
  const canUndo = useTreeStore((state) => state.history.past.length > 0);
  const canRedo = useTreeStore((state) => state.history.future.length > 0);
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [interactionMode, setInteractionMode] = useState<"select" | "drag">("select");
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [query, setQuery] = useState("");
  const [introReplay, setIntroReplay] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const archiveRef = useRef<HTMLInputElement>(null);
  const gedcomRef = useRef<HTMLInputElement>(null);
  const finishIntro = useCallback(() => setIntroActive(false), []);

  useEffect(() => {
    const browserLocale: Locale = (localStorage.getItem("miras:locale") as Locale | null) ?? (navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en");
    const isDark = localStorage.getItem("miras:theme") === "dark" || (!localStorage.getItem("miras:theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    queueMicrotask(() => { setLocale(browserLocale); setDark(isDark); });
    window.document.documentElement.lang = browserLocale;
    const activeTreeId = localStorage.getItem("miras:active-tree-v2") ?? demoDocument.tree.id;
    loadLocalDocument(activeTreeId).then((stored) => setHydrated(stored)).catch(() => setHydrated());
  }, [setHydrated]);

  useEffect(() => useTreeStore.subscribe((state, previous) => {
    if (state.selectedPersonMode === "edit" && state.selectedPersonId !== previous.selectedPersonId) setMenuOpen(false);
  }), []);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    window.document.documentElement.lang = next;
    localStorage.setItem("miras:locale", next);
  };

  const saveNow = useCallback(async (statusAfter: SaveStatus = navigator.onLine ? "saved" : "offline") => {
    setSaveStatus("saving");
    try {
      await saveLocalDocument(useTreeStore.getState().document);
      localStorage.setItem("miras:active-tree-v2", useTreeStore.getState().document.tree.id);
      setSaveStatus(statusAfter);
    } catch {
      setSaveStatus("error");
    }
  }, [setSaveStatus]);

  useEffect(() => {
    if (!hydrated || saveStatus !== "saving") return;
    const timer = window.setTimeout(() => { void saveNow(); }, 420);
    return () => window.clearTimeout(timer);
  }, [document, hydrated, saveNow, saveStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.matches("input, textarea, select, [contenteditable=true]");
      if (event.key === "Escape") { selectPerson(null); setSearchOpen(false); setMenuOpen(false); }
      if (typing) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.shiftKey && event.key.toLowerCase() === "z") { event.preventDefault(); redo(); }
      else if (modifier && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); }
      else if (event.key.toLowerCase() === "n") addPerson(copy.newPerson);
      else if (event.key.toLowerCase() === "f") { event.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addPerson, copy, redo, selectPerson, undo]);

  const toggleTheme = () => {
    setDark((current) => {
      localStorage.setItem("miras:theme", current ? "light" : "dark");
      return !current;
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    downloadUrl(URL.createObjectURL(blob), "miras-family-tree.json");
    setMenuOpen(false);
  };

  const exportMiras = () => {
    const archive = createMirasBackup(document);
    const buffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
    downloadUrl(URL.createObjectURL(new Blob([buffer], { type: "application/vnd.miras+zip" })), "miras-family-tree.miras");
    setMenuOpen(false);
  };

  const exportVisual = async (format: "svg" | "pdf") => {
    setMenuOpen(false);
    if (format === "pdf") { window.print(); return; }
    const canvas = window.document.querySelector<HTMLElement>(".canvas-wrap");
    if (!canvas) return;
    const { toSvg } = await import("html-to-image");
    const options = { backgroundColor: dark ? "#171512" : "#faf7f2", pixelRatio: 2, cacheBust: true };
    const url = await toSvg(canvas, options);
    downloadUrl(url, "miras-family-tree.svg");
  };

  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      replaceDocument(treeDocumentSchema.parse(JSON.parse(await file.text())) as TreeDocument);
    } catch {
      noticeDialog(locale === "tr" ? "Geçerli bir Miras JSON yedeği değil." : "This is not a valid Miras JSON backup.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      setMenuOpen(false);
    }
  };
  const importMiras = async (file?: File) => {
    if (!file) return;
    try {
      const restored = readMirasBackup(new Uint8Array(await file.arrayBuffer()));
      replaceDocument(treeDocumentSchema.parse(restored) as TreeDocument);
    } catch {
      noticeDialog(locale === "tr" ? "Geçerli bir .miras yedeği değil." : "This is not a valid .miras backup.");
    } finally {
      if (archiveRef.current) archiveRef.current.value = "";
      setMenuOpen(false);
    }
  };
  const importGedcom = async (file?: File) => {
    if (!file) return;
    replaceDocument(parseGedcom(await file.text(), document));
    if (gedcomRef.current) gedcomRef.current.value = "";
    setMenuOpen(false);
  };
  const exportGedcom = () => {
    downloadUrl(URL.createObjectURL(new Blob([toGedcom(document)], { type: "text/plain;charset=utf-8" })), "miras-family-tree.ged");
    setMenuOpen(false);
  };

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    if (!needle) return document.people;
    return document.people.filter((person) => [person.displayName, person.nickname, person.birthPlace, person.deathPlace, person.location, person.notes].some((value) => value?.toLocaleLowerCase(locale).includes(needle)));
  }, [document.people, locale, query]);

  const statusCopy = saveStatus === "saving" ? copy.saving : saveStatus === "offline" ? copy.offlineSaved : saveStatus === "error" ? copy.saveFailed : copy.savedLocally;

  return (
    <div className={`app-shell ${dark ? "theme-dark" : ""} ${introActive ? "intro-active" : "intro-complete"}`}>
      <SignatureIntro key={introReplay} force={introReplay > 0} onComplete={finishIntro} />

      <header className="floating-header">
        <div className="brand-lockup"><span className="brand-orbit"><HeartHandshake size={20} /></span><div><strong>Miras</strong><small>{copy.privateTrees}</small></div></div>
        <div className="header-controls">
          <button type="button" className="md-icon-button history-button" disabled={!canUndo} onClick={undo} aria-label={copy.undo}><Undo2 size={18} /></button>
          <button type="button" className="md-icon-button history-button" disabled={!canRedo} onClick={redo} aria-label={copy.redo}><Redo2 size={18} /></button>
          <button type="button" className="md-tonal-button" onClick={() => setSearchOpen(true)}><Search size={18} /><span>{copy.search}</span></button>
          <button type="button" className={`md-icon-button ${menuOpen ? "active" : ""}`} aria-label={copy.menu} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      <main className="workspace"><ReactFlowProvider><Canvas locale={locale} interactionMode={interactionMode} /></ReactFlowProvider></main>
      <DetailsDrawer locale={locale} />

      <div className="floating-actions" aria-label={copy.save}>
        <div className="mode-switch"><button className={interactionMode === "select" ? "active" : ""} type="button" onClick={() => setInteractionMode("select")} aria-label={copy.selectMode}><MousePointer2 size={18} /></button><button className={interactionMode === "drag" ? "active" : ""} type="button" onClick={() => setInteractionMode("drag")} aria-label={copy.dragMode}><Hand size={18} /></button></div>
        <button className="save-fab" type="button" onClick={() => void saveNow()}><Save size={19} /><span>{saveStatus === "saving" ? copy.saving : copy.save}</span></button>
        <button className={`settings-fab ${settingsOpen ? "active" : ""}`} type="button" onClick={() => setSettingsOpen((open) => !open)}><Settings size={19} /><span>{copy.settings}</span></button>
        <button className="add-fab" type="button" onClick={() => addPerson(copy.newPerson)}><Plus size={23} /><span>{copy.addPerson}</span></button>
      </div>

      <div className="save-chip" aria-live="polite">{saveStatus === "offline" ? <WifiOff size={13} /> : <Check size={13} />} {statusCopy}</div>

      {menuOpen && (
        <aside className="menu-sheet" aria-label={copy.menu}>
          <header><div><strong>Miras</strong><span>{copy.privacyCopy}</span></div><Info size={19} /></header>
          <section><button type="button" onClick={toggleTheme}>{dark ? <Sun size={18} /> : <Moon size={18} />}<span>{dark ? copy.lightMode : copy.darkMode}</span><ChevronRight size={16} /></button><button type="button" onClick={() => { setIntroActive(true); setIntroReplay((value) => value + 1); setMenuOpen(false); }}><RotateCcw size={18} /><span>{copy.replayIntro}</span><ChevronRight size={16} /></button><button type="button" onClick={() => changeLocale(locale === "tr" ? "en" : "tr")}><Languages size={18} /><span>{locale === "tr" ? "English" : "Türkçe"}</span><ChevronRight size={16} /></button></section>
          <section>
            <button type="button" onClick={() => { setImportOpen((open) => !open); setExportOpen(false); }}><Import size={18} /><span>{copy.import}</span><ChevronRight className={importOpen ? "chevron-open" : ""} size={16} /></button>
            {importOpen && <div className="transfer-submenu"><button className="recommended-transfer" type="button" onClick={() => archiveRef.current?.click()}><ArchiveRestore size={16} /><span>{copy.importBackup}<small>{copy.recommended}</small></span></button><button type="button" onClick={() => fileRef.current?.click()}><FileJson size={16} /><span>{copy.importJson}</span></button><button type="button" onClick={() => gedcomRef.current?.click()}><Import size={16} /><span>{copy.gedcomImport}</span></button></div>}
            <button type="button" onClick={() => { setExportOpen((open) => !open); setImportOpen(false); }}><Download size={18} /><span>{copy.export}</span><ChevronRight className={exportOpen ? "chevron-open" : ""} size={16} /></button>
            {exportOpen && <div className="transfer-submenu"><button className="recommended-transfer" type="button" onClick={exportMiras}><ArchiveRestore size={16} /><span>{copy.exportBackup}<small>{copy.recommended}</small></span></button><button type="button" onClick={exportJson}><FileJson size={16} /><span>{copy.exportJson}</span></button><button type="button" onClick={exportGedcom}><Download size={16} /><span>{copy.gedcomExport}</span></button><span className="visual-format-label">{copy.visualFormats}</span><div className="visual-format-grid"><button type="button" onClick={() => void exportVisual("svg")}>SVG</button><button type="button" onClick={() => void exportVisual("pdf")}>PDF</button></div></div>}
            <button type="button" onClick={() => { setShareOpen(true); setMenuOpen(false); }}><Share2 size={18} /><span>{copy.share}</span><ChevronRight size={16} /></button>
          </section>
          <footer><a className="github-placeholder" href="https://github.com/unrasyonel/miras" target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub"><Github size={18} /></a></footer>
        </aside>
      )}

      <input ref={archiveRef} type="file" accept=".miras,application/vnd.miras+zip" hidden onChange={(event) => void importMiras(event.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importJson(event.target.files?.[0])} />
      <input ref={gedcomRef} type="file" accept=".ged,.gedcom,text/plain" hidden onChange={(event) => void importGedcom(event.target.files?.[0])} />

      <AppDialog locale={locale} />

      {shareOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShareOpen(false)}><section className="share-dialog" role="dialog" aria-modal="true" aria-label={copy.share}><header><strong>{copy.share}</strong><button type="button" onClick={() => setShareOpen(false)} aria-label={copy.close}><X size={18} /></button></header><div className="share-permissions"><button className={sharePermission === "view" ? "active" : ""} onClick={() => setSharePermission("view")}><Eye size={18} /><span>{copy.viewOnly}</span></button><button className={sharePermission === "edit" ? "active" : ""} onClick={() => setSharePermission("edit")}><Pencil size={18} /><span>{copy.canEdit}</span></button></div><p>{copy.shareAccountNote}</p></section></div>}

      {settingsOpen && <aside className="customize-panel" aria-label={copy.settings}><header><div><Settings size={18} /><strong>{copy.settings}</strong></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label={copy.close}><X size={17} /></button></header><section><span>{copy.cardShape}</span><div className="card-style-options">{(["rectangle", "oval", "square"] as const).map((shape) => <button key={shape} type="button" className={document.settings.cardShape === shape ? "active" : ""} onClick={() => updateSettings({ cardShape: shape })}><i className={`card-style-preview preview-${shape}`}><b /><b /></i><small>{shape === "rectangle" ? copy.rectangle : shape === "oval" ? copy.oval : copy.square}</small></button>)}</div></section><section className="visibility-options"><button className={(document.settings.showPhotos ?? true) ? "active" : ""} type="button" onClick={() => updateSettings({ showPhotos: !(document.settings.showPhotos ?? true) })} aria-label={copy.showPhotos}><ImageIcon size={18} /></button><button className={(document.settings.showDates ?? true) ? "active" : ""} type="button" onClick={() => updateSettings({ showDates: !(document.settings.showDates ?? true) })} aria-label={copy.showDates}><CalendarDays size={18} /></button><button className={(document.settings.showMiniMap ?? true) ? "active" : ""} type="button" onClick={() => updateSettings({ showMiniMap: !(document.settings.showMiniMap ?? true) })} aria-label={copy.minimap}><MapIcon size={18} /></button></section><section><span>{copy.lineWidth}</span><div className="compact-options">{(["thin","medium","bold"] as const).map((value) => <button className={document.settings.edgeWidth === value ? "active" : ""} key={value} onClick={() => updateSettings({ edgeWidth: value })}><i style={{ height: value === "thin" ? 1 : value === "bold" ? 4 : 2 }} /></button>)}</div></section></aside>}

      {searchOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
        <section className="search-dialog" role="dialog" aria-modal="true" aria-label={copy.search}>
          <div className="dialog-search"><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPeople} /><button type="button" onClick={() => setSearchOpen(false)} aria-label={copy.close}><X size={18} /></button></div>
          <div className="search-results">
            <span>{results.length} {copy.people}</span>
            {results.slice(0, 60).map((person) => <button type="button" key={person.id} onClick={() => { selectPerson(person.id, "view"); setSearchOpen(false); }}><div>{person.displayName.slice(0, 1)}</div><span><strong>{person.displayName}</strong><small>{person.location || person.birthPlace || copy.location}</small></span><ChevronRight size={16} /></button>)}
            {!results.length && <p>{copy.noResults}</p>}
          </div>
        </section>
      </div>}
    </div>
  );
}

export function FamilyTreeEditor() {
  return <EditorShell />;
}
