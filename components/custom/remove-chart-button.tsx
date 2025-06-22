import { X } from "lucide-react";
import { ButtonHTMLAttributes } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useDashboardStore from "@/hooks/use-dashboard-store";
import { AppState } from "@/types/app-state";

import { Button } from "../ui/button";

interface RemoveChartButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  nodeId: string;
  chartTitle: string;
}

const selector = (state: AppState) => ({
  nodes: state.nodes,
  setNodes: state.setNodes,
});

export default function RemoveChartButton({ nodeId, className }: RemoveChartButtonProps) {
  const { nodes, setNodes } = useDashboardStore(useShallow(selector));

  const onRemoveChart = () => {
    // Filter out the node with the matching ID
    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    setNodes(updatedNodes);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={onRemoveChart}
            className={`${className} hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-800 dark:hover:text-red-400`}
          >
            <X className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Remove from dashboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}