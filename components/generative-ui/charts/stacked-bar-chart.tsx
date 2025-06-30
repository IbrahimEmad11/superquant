"use client";

import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";

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
  dataKeys?: string[]; // Add support for dataKeys from the backend
  noAddButton?: boolean;
}

export function StackedBarChartCard({
  title,
  caption,
  data,
  dataKeys,
  noAddButton,
}: StackedBarChartProps) {
  const getSegmentColor = (index: number) => {
    const colors = ["#ed618e", "#415dcc", "#82ca9d", "#ff7c7c", "#8dd1e1"];
    return colors[index % colors.length];
  };
  const keysToRender = dataKeys || ['value', 'value2', 'value3'].filter(key => 
    data.some(item => item[key as keyof typeof item] !== undefined)
  );

  const hasStackedData = keysToRender.length > 1;

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              accessibilityLayer 
              data={data}
              margin={{
                left: 20,
                right: 20,
                top: 20,
                bottom: 20,
              }}
            >
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
              {keysToRender.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="stack"
                  radius={
                    index === 0 
                      ? [0, 0, 4, 4]
                      : index === keysToRender.length - 1 
                      ? [4, 4, 0, 0]
                      : [0, 0, 0, 0]
                  }
                  fill={getSegmentColor(index)}
                />
              ))}
              
              {/* If no stacked data, show a single bar */}
              {!hasStackedData && (
                <Bar
                  dataKey="value"
                  radius={[4, 4, 4, 4]}
                  fill={getSegmentColor(0)}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
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