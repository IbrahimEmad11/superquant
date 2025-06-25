"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ReactNode } from "react";

import {
  BarChartCard,
  LineChartCard,
  PieChartCard,
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

  // Check if there's any visible content to render
  const hasContent = content && (typeof content === 'string' ? content.trim() : true);
  const hasAttachments = attachments && attachments.length > 0;
  
  // Check if there are any visible tool invocations
  const hasVisibleTools = toolInvocations && toolInvocations.some(tool => {
    const { toolName, state } = tool;
    
    // Show if it's in call state (thinking...)
    if (state === "call") return true;
    
    // Show if it's a result from a displayable tool
    if (state === "result") {
      if (isThinkingTool(toolName)) return false; // Hide thinking tools
      // Show known tools
      return ["getWeather", "showPieChart", "showBarChart", "showLineChart"].includes(toolName);
    }
    
    return false;
  });

  // If there's no visible content, don't render the message at all
  if (!hasContent && !hasAttachments && !hasVisibleTools) {
    return null;
  }

  const renderToolInvocation = (toolInvocation: ToolInvocation) => {
    const { toolName, toolCallId, state } = toolInvocation;

    // Show "Thinking..." for any tool being called
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