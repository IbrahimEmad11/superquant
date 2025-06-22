"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  Node,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { useState, useMemo, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import useDashboardStore from "@/hooks/use-dashboard-store";
import { AppState } from "@/types/app-state";

import "@xyflow/react/dist/style.css";
import { DashboardChart, WelcomeCard } from "./custom-dashboard-nodes";

const selector = (state: AppState) => ({
  nodes: state.nodes,
  onNodesChange: state.onNodesChange,
  onConnect: state.onConnect,
});

const initialNodes = [
  {
    id: "welcome",
    type: "welcomeCard",
    position: { x: 0, y: 0 },
    data: { value: "Welcome to your dashboard!" },
  },
];

export default function DashboardPanelFlow({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { nodes, onNodesChange, onConnect } = useDashboardStore(
    useShallow(selector)
  );

  const { fitView } = useReactFlow();

  const nodeTypes = useMemo(
    () => ({ welcomeCard: WelcomeCard, dashboardChart: DashboardChart }),
    []
  );

  const onLoad = () => {
    fitView();
  };

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({
          padding: 0.2,
          duration: 200,
        });
      }, 100);
    }
  }, [nodes.length, fitView]);

  if (!isMounted) {
    return null; 
  }

  return (
    <ReactFlow
      proOptions={{ hideAttribution: true }}
      colorMode={theme === "dark" ? "dark" : "light"}
      nodes={nodes.length > 0 ? nodes : initialNodes}
      nodeTypes={nodeTypes}
      onLoad={onLoad}
      snapToGrid={true}
      snapGrid={[10, 10]}
      panOnScroll={true}
      selectionOnDrag={true}
      panOnDrag={[1, 2]}
      zoomOnScroll={false}
      zoomOnPinch={true}
      zoomOnDoubleClick={false}
      nodesDraggable={!isReadOnly}
      nodesConnectable={!isReadOnly}
      selectNodesOnDrag={!isReadOnly}
      elementsSelectable={!isReadOnly}
      onNodesChange={isReadOnly ? undefined : onNodesChange}
      onConnect={isReadOnly ? undefined : onConnect}

    >
      <Background
        color="#333333"
        variant={BackgroundVariant.Dots}
        gap={15}
        size={1}
      />
      {!isReadOnly && <Controls />}
  
      
      <MiniMap style={{ width: 150, height: 100 }} />
    </ReactFlow>
  );
}