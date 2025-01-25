import { PlayIcon } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export function WelcomeCard() {
  return (
    <div className="flex h-[450px] w-[700px] bg-background shrink-0 items-center justify-center rounded-md border border-foreground/20 relative">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <Image
          src="/images/superquant-logo.svg"
          height={70}
          width={70}
          alt="superquant logo"
        />
        <br />
        <h3 className="mt-4 text-lg font-semibold">Welcome to SuperQuant!</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          This is your <u>SuperQuant Dashboard</u>. You can start adding your
          charts from the chat to this panel to build your own report.
        </p>
        <div className="flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {}}
            className="text-xs w-[150px]"
          >
            <PlayIcon className="mr-2" />
            Watch Tutorial
          </Button>
        </div>
      </div>
      {/* <Cross1Icon
        onClick={handleClose}
        className="size-5 absolute top-5 right-5 cursor-pointer hover:text-muted-foreground"
      /> */}
    </div>
  );
}
