"use client";

import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

import ChartButton from "@/components/custom/chart-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ScatterChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value: number;
    x?: number;
    y?: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function ScatterChartCard({
  title,
  caption,
  data,
  noAddButton,
}: ScatterChartProps) {
  // Transform data for scatter plot (use value as both x and y if not provided)
  const scatterData = data.map((item, index) => ({
    x: item.x ?? index,
    y: item.y ?? item.value,
    name: item.label,
    fill: item.fill,
  }));

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <ChartContainer config={{}}>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              data={scatterData}
              margin={{
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
              }}
            >
              <CartesianGrid />
              <XAxis type="number" dataKey="x" />
              <YAxis type="number" dataKey="y" />
              <ChartTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ChartTooltipContent />}
              />
              <Scatter dataKey="y" fill={data[0]?.fill || "#8884d8"} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "scatter",
              title,
              caption,
              data,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}