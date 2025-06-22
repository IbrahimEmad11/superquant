import { PlusIcon } from "lucide-react";
import { ButtonHTMLAttributes } from "react";
import { v4 as uuidv4 } from "uuid";
import { useShallow } from "zustand/react/shallow";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useDashboardStore from "@/hooks/use-dashboard-store";
import { AppState } from "@/types/app-state";
import { ChartType } from "@/types/chart-type";

import { Button } from "../ui/button";

interface ChartButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  chart: {
    type: ChartType;
    title: string;
    caption: string;
    data: {}[];
  };
}

const selector = (state: AppState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
});

export default function ChartButton({ chart, className }: ChartButtonProps) {
  const { nodes, setNodes } = useDashboardStore(useShallow(selector));

  const onAddChart = () => {
    const lastNode = nodes[nodes.length - 1];
    const newPosition = lastNode
      ? { x: lastNode.position.x + 610, y: lastNode.position.y }
      : { x: 0, y: 0 };

    setNodes([
      ...nodes,
      {
        id: uuidv4(),
        type: "dashboardChart",
        position: newPosition,
        data: { chart },
      },
    ]);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={onAddChart}
            className={className}
          >
            <PlusIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add to dashboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
