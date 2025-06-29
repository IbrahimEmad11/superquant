"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
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

interface AreaChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function AreaChartCard({
  title,
  caption,
  data,
  noAddButton,
}: AreaChartProps) {
  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <ChartContainer config={{}}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 6)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Area
                dataKey="value"
                type="natural"
                fill="url(#fillArea)"
                fillOpacity={0.4}
                stroke={data[0]?.fill || "#8884d8"}
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={data[0]?.fill || "#8884d8"}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={data[0]?.fill || "#8884d8"}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "area",
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