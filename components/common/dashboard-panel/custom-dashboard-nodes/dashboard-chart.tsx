import { NodeProps } from "@xyflow/react";

import RemoveChartButton from "@/components/custom/remove-chart-button";
import {
  BarChartCard,
  LineChartCard,
  PieChartCard,
} from "@/components/generative-ui/charts";
import { cn } from "@/lib/utils";
import { ChartCardData, ChartType } from "@/types/chart-type";

export function DashboardChart({ id, data, selected = false }: NodeProps) {
  const chartType = (data as any).chart.type as ChartType;
  const {
    title,
    caption,
    data: chartData,
  } = (data as any).chart as ChartCardData;
  
  let content;
  if (chartType === "pie") {
    content = (
      <PieChartCard
        title={title}
        caption={caption}
        data={chartData}
        noAddButton
      />
    );
  } else if (chartType === "bar") {
    content = (
      <BarChartCard
        title={title}
        caption={caption}
        data={chartData}
        noAddButton
      />
    );
  } else if (chartType === "line") {
    content = (
      <LineChartCard
        title={title}
        caption={caption}
        data={chartData}
        noAddButton
      />
    );
  } else {
    content = <div>Chart {chartType}</div>;
  }

  return (
    <div className="relative group">
      <RemoveChartButton 
        nodeId={id}
        chartTitle={title}
        className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      
      <div
        className={cn(
          "w-[600px] h-[450px] border rounded-md",
          selected ? "border-red-900" : "border-red-900/30"
        )}
      >
        {/* <NodeResizer minWidth={100} minHeight={30} /> */}
        {content}
      </div>
    </div>
  );
}