import Image from "next/image";
import Link from "next/link";

import { auth, signOut } from "@/app/(auth)/auth";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { History } from "./history";
import { SlashIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";


export const Navbar = async ({ tools }: { tools?: React.ReactNode }) => {
  const session = await auth();
  return (
    <>
      <div className="bg-background absolute top-0 left-0 w-dvw py-2 px-4 justify-between flex flex-row items-center z-30">
        <div className="flex flex-row gap-4 items-center">
          <History user={session?.user} />
          <div className="flex flex-row gap-2 items-center">
            <Link href="/">
              <Image
                src="/images/superquant-logo.svg"
                height={15}
                width={15}
                alt="superquant logo"
              />
            </Link>
            <div className="text-zinc-500">
              <SlashIcon size={16} />
            </div>
            <div className="text-sm dark:text-zinc-300 truncate w-28 md:w-fit">
              SuperQuant AI{" "}
              <Badge className="ml-2 bg-primary/30 border border-primary/50 text-primary opacity-50 rounded-sm">
                Alpha
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-2 items-center">
          {tools}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="py-1.5 px-2 h-fit font-normal"
                  variant="secondary"
                >
                  {session.user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem className="p-1 z-50">
                  <form
                    className="w-full"
                    action={async () => {
                      "use server";

                      await signOut({
                        redirectTo: "/",
                      });
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full text-left px-1 py-0.5 text-red-500"
                    >
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              className="py-1.5 px-2 h-fit font-normal text-white"
              asChild
            >
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
