"use client";

import { memo, type CSSProperties } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  useStore,
  useViewport,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { Heart, Unlink, UserRoundPlus } from "lucide-react";
import { useTreeStore } from "@/lib/store";
import type { Locale } from "@/lib/i18n";
import { messages } from "@/lib/i18n";
import type { RelationshipType } from "@/lib/types";
import { roundedFamilyPath, type Obstacle } from "@/lib/family-layout";

export const edgeColors = ["#d27643", "#7d3b57", "#2f6f68", "#386a9b", "#7656a8", "#bf4f62", "#b08238", "#5f6368"];

export type RelationshipEdgeData = {
  relationshipId: string;
  relationshipType: RelationshipType;
  color: string;
  locale: Locale;
  originX?: number;
  originY?: number;
  junctionY?: number;
  familyParentIds?: string[];
  obstacles?: Obstacle[];
  edgeWidth: "thin" | "medium" | "bold";
} & Record<string, unknown>;

export type RelationshipFlowEdge = Edge<RelationshipEdgeData, "relationship">;

export const RelationshipEdge = memo(function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<RelationshipFlowEdge>) {
  const updateRelationship = useTreeStore((state) => state.updateRelationship);
  const addChildForRelationship = useTreeStore((state) => state.addChildForRelationship);
  const deleteRelationship = useTreeStore((state) => state.deleteRelationship);
  const selectPerson = useTreeStore((state) => state.selectPerson);
  const locale = data?.locale ?? "en";
  const { zoom } = useViewport();
  const selectedNodeCount = useStore((state) => state.nodes.filter((node) => node.selected).length);
  const copy = messages[locale];
  const romantic = data?.relationshipType === "spouse" || data?.relationshipType === "partner";
  const pathSourceX = data?.originX ?? sourceX;
  const pathSourceY = data?.originY ?? sourceY;
  const familyPath = data?.originX !== undefined && data?.originY !== undefined && data?.junctionY !== undefined;
  const pathResult = familyPath ? [
    roundedFamilyPath(data.originX!, data.originY!, data.junctionY!, targetX, targetY, data.obstacles),
    targetX,
    (data.junctionY! + targetY) / 2,
  ] as const : getSmoothStepPath({
    sourceX: pathSourceX,
    sourceY: pathSourceY,
    targetX,
    targetY,
    sourcePosition: data?.originX !== undefined ? Position.Bottom : sourcePosition,
    targetPosition,
    borderRadius: 24,
    offset: 34,
  });
  const [path, labelX, labelY] = pathResult;
  const dash = data?.relationshipType === "adoptive-parent" ? "10 7"
    : data?.relationshipType === "step-parent"
      ? "3 7"
      : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={28}
        style={{
          stroke: data?.color ?? edgeColors[0],
          strokeWidth: selected ? 3.4 : data?.edgeWidth === "thin" ? 1.5 : data?.edgeWidth === "bold" ? 3.4 : 2.2,
          strokeDasharray: dash,
          filter: selected ? "drop-shadow(0 2px 5px color-mix(in srgb, currentColor 22%, transparent))" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-center nodrag nopan ${selected ? "is-selected" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {romantic && <span className="edge-heart" style={{ color: data?.color }}><Heart size={14} fill="currentColor" /></span>}
          {selected && selectedNodeCount < 2 && (
            <div className="edge-popover" role="dialog" aria-label={copy.relationship} style={{ "--edge-ui-scale": 1 / zoom } as CSSProperties}>
              <span>{copy.edgeColor}</span>
              <div className="edge-colors">
                {edgeColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    className={data?.color === color ? "active" : ""}
                    style={{ background: color }}
                    onClick={() => updateRelationship(data!.relationshipId, { color })}
                  />
                ))}
              </div>
              {romantic && (
                <button
                  className="edge-add-child"
                  type="button"
                  onClick={() => {
                    const childId = addChildForRelationship(data!.relationshipId, copy.newChild);
                    if (childId) selectPerson(childId, "edit");
                  }}
                >
                  <UserRoundPlus size={15} /> {copy.addChild}
                </button>
              )}
              <button className="edge-unlink" type="button" onClick={() => deleteRelationship(data!.relationshipId)}><Unlink size={14} /> {copy.unlink}</button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
