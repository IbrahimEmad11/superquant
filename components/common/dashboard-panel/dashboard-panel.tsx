"use client";
import { ReactFlowProvider } from "@xyflow/react";

import DashboardPanelFlow from "./dashboard-panel-flow";
import { Node } from "@xyflow/react";
import useDashboardStore from "@/hooks/use-dashboard-store";
import { useEffect } from "react";

interface DashboardPanelProps {
  dashboardNodes: Node[];
  chatId: string;
}

export default function DashboardPanel({
  dashboardNodes,
}: DashboardPanelProps) {
  const { setNodes } = useDashboardStore();

  useEffect(() => {
    setNodes(dashboardNodes);
  }, [dashboardNodes]);

  return (
    <div className="size-full pb-12">
      <div className="size-full">
        <ReactFlowProvider>
          <DashboardPanelFlow />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
