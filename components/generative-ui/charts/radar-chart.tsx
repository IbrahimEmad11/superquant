"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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

interface RadarChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function RadarChartCard({
  title,
  caption,
  data,
  noAddButton,
}: RadarChartProps) {
  // Transform data for radar chart
  const radarData = data.map(item => ({
    subject: item.label,
    value: item.value,
    fullMark: Math.max(...data.map(d => d.value)) * 1.2, // Set max scale
  }));

  return (
    <Card className="flex flex-col size-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 relative">
        <ChartContainer
          config={{}}
          className="mx-auto aspect-square max-h-[350px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis
                angle={0}
                domain={[0, "dataMax"]}
                tick={false}
                tickCount={5}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Radar
                name="Value"
                dataKey="value"
                stroke={data[0]?.fill || "#8884d8"}
                fill={data[0]?.fill || "#8884d8"}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "radar",
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