import type { HitTargets, Node, Relationship } from "@neo4j-nvl/base";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { MouseEventCallbacks } from "@neo4j-nvl/react";
import React, { useState } from "react";

function GraphView({ nodes, relations }) {
  const mouseEventCallbacks: MouseEventCallbacks = {
    onHover: (
      element: Node | Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onHover", element, hitTargets, evt),
    onRelationshipRightClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onRelationshipRightClick", rel, hitTargets, evt),
    onNodeClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
      console.log("onNodeClick", node, hitTargets, evt),
    onNodeRightClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
      console.log("onNodeRightClick", node, hitTargets, evt),
    onNodeDoubleClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
      console.log("onNodeDoubleClick", node, hitTargets, evt),
    onRelationshipClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onRelationshipClick", rel, hitTargets, evt),
    onRelationshipDoubleClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onRelationshipDoubleClick", rel, hitTargets, evt),
    onCanvasClick: (evt: MouseEvent) => console.log("onCanvasClick", evt),
    onCanvasDoubleClick: (evt: MouseEvent) =>
      console.log("onCanvasDoubleClick", evt),
    onCanvasRightClick: (evt: MouseEvent) =>
      console.log("onCanvasRightClick", evt),
    onDrag: (nodes: Node[]) => console.log("onDrag", nodes),
    onPan: (evt: MouseEvent) => console.log("onPan", evt),
    onZoom: (zoomLevel: number) => console.log("onZoom", zoomLevel),
  };

  console.log(nodes);
  return (
    <InteractiveNvlWrapper
      nodes={nodes}
      rels={relations}
      mouseEventCallbacks={mouseEventCallbacks}
      className={"bg-gray-100"}
    />
  );
}

export default GraphView;
