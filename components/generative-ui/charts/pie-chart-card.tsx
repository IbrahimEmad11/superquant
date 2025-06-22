"use client";

import { Pie, PieChart, ResponsiveContainer } from "recharts";

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

interface PieChartCardProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function PieChartCard({
  title,
  caption,
  data,
  noAddButton,
}: PieChartCardProps) {
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
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={60}
                strokeWidth={5}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "pie",
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
