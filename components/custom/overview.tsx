import { motion } from "framer-motion";
import { LogoOpenAI } from "./icons";

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-[500px] mt-20 mx-4 md:mx-0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="border-none bg-muted/50 rounded-2xl p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
        {/* <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <VercelIcon />
          <span>+</span>
          <MessageIcon />
        </p> */}
        <p>
          This is a chatbot powered by SuperQuant AI. It uses the the latest LLM
          Models like{" "}
          <code className="rounded-sm bg-muted-foreground/15 px-1.5 py-0.5 inline-flex flex-row gap-2 items-center w-fit">
            <LogoOpenAI size={12} />
            OpenAI-O1
          </code>{" "}
          and our own knowledge graph engine to provide you with an experience
          that matches the experience of a data analyst.
        </p>
        <p>
          We also use cutting edge software techniques like streaming,
          generative UI, SSR, caching, etc. to provide you with a fast and
          responsive experience. 🫡
        </p>
      </div>
    </motion.div>
  );
};
