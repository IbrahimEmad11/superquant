"use client";

import { ReactFlowProvider, Node } from "@xyflow/react";
import { useEffect } from "react";

import useDashboardStore from "@/hooks/use-dashboard-store";

import DashboardPanelFlow from "./dashboard-panel-flow";

interface DashboardPanelProps {
  dashboardNodes: Node[];
  chatId: string;
  isReadOnly?: boolean;
}

export default function DashboardPanelComponent({
  dashboardNodes,
  isReadOnly = false, 
}: DashboardPanelProps) {
  const { setNodes } = useDashboardStore();
  
  useEffect(() => {
    setNodes(dashboardNodes);
  }, [dashboardNodes, setNodes]);

  return (
    <div className="size-full pb-12">
      <div className="size-full">
        <ReactFlowProvider>
          <DashboardPanelFlow isReadOnly={isReadOnly} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
