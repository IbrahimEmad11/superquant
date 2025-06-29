"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ReactNode } from "react";

import {
  BarChartCard,
  LineChartCard,
  PieChartCard,
  AreaChartCard,
  ScatterChartCard,
  DonutChartCard,
  StackedBarChartCard,
  RadarChartCard,
} from "../generative-ui/charts";
import { Weather } from "../generative-ui/weather";
import AnimatedShinyText from "../ui/animated-shiny-text";

import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";

export const Message = ({
  chatId,
  role,
  content,
  toolInvocations,
  attachments,
  isReadOnly = false,
}: {
  chatId: string;
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
  isReadOnly?: boolean;
}) => {

  const hasContent = content && (typeof content === 'string' ? content.trim() : true);
  const hasAttachments = attachments && attachments.length > 0;
  
  // Updated to include the new consolidated chart tool
  const chartTools = [
    "getWeather",
    "showChart", // New consolidated tool
    // Keep these for backwards compatibility if needed
    "showPieChart", 
    "showBarChart", 
    "showLineChart",
    "showAreaChart",
    "showScatterChart",
    "showDonutChart",
    "showStackedBarChart",
    "showRadarChart"
  ];
  
  const hasVisibleTools = toolInvocations && toolInvocations.some(tool => {
    const { toolName, state } = tool;

    if (state === "call") return true;
    
    if (state === "result") {
      if (isThinkingTool(toolName)) return false;
      return chartTools.includes(toolName);
    }
    return false;
  });

  if (!hasContent && !hasAttachments && !hasVisibleTools) {
    return null;
  }

  // Helper function to render chart based on type
  const renderChartByType = (type: string, result: any, isReadOnly: boolean) => {
    const commonProps = {
      title: result.title,
      caption: result.caption,
      data: result.data,
      noAddButton: isReadOnly
    };

    switch (type) {
      case "pie":
        return <PieChartCard {...commonProps} />;
      case "bar":
        return <BarChartCard {...commonProps} />;
      case "line":
        return <LineChartCard {...commonProps} />;
      case "area":
        return <AreaChartCard {...commonProps} />;
      case "scatter":
        return <ScatterChartCard {...commonProps} />;
      case "donut":
        return <DonutChartCard {...commonProps} />;
      case "stackedBar":
        return <StackedBarChartCard {...commonProps} />;
      case "radar":
        return <RadarChartCard {...commonProps} />;
      default:
        console.warn(`Unknown chart type: ${type}`);
        return <div>Unsupported chart type: {type}</div>;
    }
  };

  const renderToolInvocation = (toolInvocation: ToolInvocation) => {
    const { toolName, toolCallId, state } = toolInvocation;

    if (state === "call") {
      return (
        <div key={toolCallId} className="my-1">
          <AnimatedShinyText className="inline-flex items-center justify-center transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
            <span>Thinking...</span>
          </AnimatedShinyText>
        </div>
      );
    }

    if (state === "result") {
      const { result } = toolInvocation;

      if (isThinkingTool(toolName)) {
        return null;
      }
      
      return (
        <div key={toolCallId} className="my-1">
          {toolName === "getWeather" ? (
            <Weather weatherAtLocation={result} />
          ) : toolName === "showChart" ? (
            // Handle the new consolidated chart tool
            renderChartByType(result.type, result, isReadOnly)
          ) : toolName === "showPieChart" ? (
            <PieChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly}
            />
          ) : toolName === "showBarChart" ? (
            <BarChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly} 
            />
          ) : toolName === "showLineChart" ? (
            <LineChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly} 
            />
          ) : toolName === "showAreaChart" ? (
            <AreaChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly} 
            />
          ) : toolName === "showScatterChart" ? (
            <ScatterChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly} 
            />
          ) : toolName === "showDonutChart" ? (
            <DonutChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly} 
            />
          ) : toolName === "showStackedBarChart" ? (
            <StackedBarChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly} 
            />
          ) : toolName === "showRadarChart" ? (
            <RadarChartCard
              title={result.title}
              caption={result.caption}
              data={result.data}
              noAddButton={isReadOnly} 
            />
          ) : null}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-2 w-full">

        {content && typeof content === "string" && (
          <div className="text-zinc-800 dark:text-zinc-300 flex flex-col gap-4">
            <Markdown>{content}</Markdown>
          </div>
        )}

        {content && typeof content !== "string" && content}

        {toolInvocations && toolInvocations.length > 0 && (
          <div className="flex flex-col gap-2">
            {toolInvocations.map(renderToolInvocation)}
          </div>
        )}

        {attachments && attachments.length > 0 && (
          <div className="flex flex-row gap-2 flex-wrap">
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

function isThinkingTool(toolName: string): boolean {
  const thinkingTools = [
    'think',
    'thinking',
    'reason',
    'reasoning', 
    'reflect',
    'reflection',
    'analyze',
    'analysis',
    'consider',
    'deliberate',
    'ponder',
    'contemplate',
    'internal_thought',
    'chain_of_thought',
    'step_by_step',
    'reasoning_step'
  ];
  
  const lowerToolName = toolName.toLowerCase();
  return thinkingTools.some(thinkTool => 
    lowerToolName.includes(thinkTool) || 
    lowerToolName === thinkTool
  );
}