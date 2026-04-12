"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BadgeCheckIcon,
  BellIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function StudioUserMenu() {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const user = {
    name: clerkUser?.fullName ?? clerkUser?.firstName ?? "User",
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? "user@example.com",
    avatar: clerkUser?.imageUrl || undefined,
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-10 gap-2 px-2 font-normal hover:bg-transparent md:h-9 md:px-2"
            aria-label="Account menu"
          />
        }
      >
        <Avatar className="size-8 border-2 border-foreground/10">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden min-w-0 flex-1 text-left text-sm leading-tight md:grid">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
        <ChevronsUpDownIcon className="hidden size-4 opacity-50 md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" align="end" sideOffset={6}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <BadgeCheckIcon />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <BellIcon />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (!isLoaded) return;
            void signOut({ redirectUrl: "/login" });
          }}
        >
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
