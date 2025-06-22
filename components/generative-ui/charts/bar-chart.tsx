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

interface BarChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function BarChartCard({
  title,
  caption,
  data,
  noAddButton,
}: BarChartProps) {
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
            <Bar dataKey="value" radius={8} />
          </BarChart>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "bar",
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