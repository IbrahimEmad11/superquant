"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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

interface StackedBarChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value: number;
    value2?: number;
    value3?: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function StackedBarChartCard({
  title,
  caption,
  data,
  noAddButton,
}: StackedBarChartProps) {
  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <ChartContainer config={{}}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="value"
              stackId="a"
              radius={[0, 0, 4, 4]}
              fill={data[0]?.fill || "#8884d8"}
            />
            {data.some(item => item.value2 !== undefined) && (
              <Bar
                dataKey="value2"
                stackId="a"
                radius={[0, 0, 0, 0]}
                fill="#82ca9d"
              />
            )}
            {data.some(item => item.value3 !== undefined) && (
              <Bar
                dataKey="value3"
                stackId="a"
                radius={[4, 4, 0, 0]}
                fill="#ffc658"
              />
            )}
          </BarChart>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "stackedBar",
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