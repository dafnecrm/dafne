"use client";

import { LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@/lib/session";

type MenuUser = Pick<User, "name" | "firstname" | "lastname" | "email" | "image">;

export function UserMenu({ user }: { user: MenuUser }) {
  const [pending, startTransition] = useTransition();
  const initials = `${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-lg" className="rounded-full" />}
        aria-label="Account menu"
      >
        <Avatar>
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm text-foreground">{user.name}</span>
            <span className="font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account" />}>
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
  );
}
