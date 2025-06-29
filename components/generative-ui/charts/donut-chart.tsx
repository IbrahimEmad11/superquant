"use client";

import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";

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

interface DonutChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function DonutChartCard({
  title,
  caption,
  data,
  noAddButton,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

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
                innerRadius={90}
                outerRadius={140}
                strokeWidth={5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              {/* Center text showing total */}
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-2xl font-bold"
              >
                {total.toLocaleString()}
              </text>
              <text
                x="50%"
                y="50%"
                dy={20}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-sm"
              >
                Total
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "donut",
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