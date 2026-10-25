"use client";

import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@/lib/session";

type NavUserProps = Pick<User, "name" | "firstname" | "lastname" | "email" | "image">;

function UserAvatar({ user }: { user: NavUserProps }) {
  const initials = `${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase();
  return (
    <Avatar>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

function UserText({ user }: { user: NavUserProps }) {
  return (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.name}</span>
      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
    </div>
  );
}

/** Signed-in user in the sidebar footer, with the account menu. */
export function NavUser({ user }: { user: NavUserProps }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [pending, startTransition] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" aria-label="Account menu" />}
          >
            <UserAvatar user={user} />
            <UserText user={user} />
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            className="w-(--anchor-width) min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 p-1.5 text-foreground">
                <UserAvatar user={user} />
                <UserText user={user} />
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/account" onClick={() => setOpenMobile(false)} />}>
              <UserIcon />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => signOut())}
            >
              {pending ? <Spinner /> : <LogOutIcon />}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
