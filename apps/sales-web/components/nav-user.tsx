"use client";

import {
  ChevronsUpDownIcon,
  LanguagesIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@dafne/frontend-ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@dafne/frontend-ui/components/sidebar";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import { routing, type AppLocale } from "@/i18n/routing";
import { authClient } from "@dafne/frontend-auth/client";
import type { User } from "@/lib/session";

type NavUserProps = Pick<
  User,
  "name" | "firstname" | "lastname" | "email" | "image"
>;

function UserAvatar({ user }: { user: NavUserProps }) {
  const initials =
    `${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase();
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
      <span className="truncate text-xs text-muted-foreground">
        {user.email}
      </span>
    </div>
  );
}

/** Each language in its own language, so it's found whatever is active. */
const LANGUAGE_NAMES: Record<AppLocale, string> = {
  en: "English",
  it: "Italiano",
};

/** Saves the language for a year; the proxy reads it on every request. */
function saveLocale(locale: AppLocale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** Signed-in user in the sidebar footer, with the account menu. */
export function NavUser({ user }: { user: NavUserProps }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("account.menu");
  const locale = useLocale();

  const changeLocale = (value: AppLocale) =>
    startTransition(() => {
      saveLocale(value);
      // Renders the page again, now in the new language.
      router.refresh();
    });

  const signOut = () =>
    startTransition(async () => {
      // Ends the session on the backend and clears its cookies.
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" aria-label={t("label")} />}
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
            <DropdownMenuItem
              render={
                <Link href="/account" onClick={() => setOpenMobile(false)} />
              }
            >
              <UserIcon />
              {t("account")}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LanguagesIcon />
                {t("language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={locale}
                  onValueChange={(value) => changeLocale(value as AppLocale)}
                >
                  {routing.locales.map((value) => (
                    <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                      {LANGUAGE_NAMES[value]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onClick={signOut}
            >
              {pending ? <Spinner /> : <LogOutIcon />}
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
