"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  Legend,
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
    value?: number;
    value2?: number;
    value3?: number;
    fill?: string;
    [key: string]: any;
  }[];
  dataKeys?: string[];
  noAddButton?: boolean;
}

export function AreaChartCard({
  title,
  caption,
  data,
  dataKeys,
  noAddButton,
}: AreaChartProps) {
  const detectDataKeys = () => {
    if (dataKeys && dataKeys.length > 0) {
      return dataKeys;
    }
    const sampleItem = data[0];
    if (!sampleItem) return ['value'];

    const numericKeys = Object.keys(sampleItem).filter(key => {
      return key !== 'label' && 
             key !== 'fill' && 
             typeof sampleItem[key] === 'number' && 
             sampleItem[key] !== undefined;
    });
    if (numericKeys.length > 0) {
      return numericKeys;
    }

    const legacyKeys = ['value', 'value2', 'value3'].filter(key => 
      data.some(item => item[key] !== undefined)
    );

    return legacyKeys.length > 0 ? legacyKeys : ['value'];
  };

  const keysToRender = detectDataKeys();

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
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
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 6)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              {keysToRender.map((key, index) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="natural"
                  fill={`url(#fillArea${index + 1})`}
                  fillOpacity={0.4}
                  stroke={data[0]?.fill || `hsl(${index * 360 / keysToRender.length}, 70%, 50%)`}
                  strokeWidth={2}
                />
              ))}
              
              <defs>
                {keysToRender.map((key, index) => (
                  <linearGradient key={`gradient-${key}`} id={`fillArea${index + 1}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={data[0]?.fill || `hsl(${index * 360 / keysToRender.length}, 70%, 50%)`}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={data[0]?.fill || `hsl(${index * 360 / keysToRender.length}, 70%, 50%)`}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
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