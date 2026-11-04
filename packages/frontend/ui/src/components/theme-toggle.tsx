"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import { setTheme, useTheme, type Theme } from "@dafne/frontend-ui/lib/theme";

const OPTIONS: { value: Theme; icon: typeof SunIcon }[] = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "system", icon: MonitorIcon },
];

/** Light / dark / system theme switcher. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const t = useTranslations("theme");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" className={className} />}
        aria-label={t("change")}
      >
        {/* Driven by the `dark` class, so it's right before hydration too. */}
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              closeOnClick
            >
              <option.icon />
              {t(option.value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
