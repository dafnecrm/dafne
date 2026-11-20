"use client";

import { useTranslations } from "next-intl";
import { HistoryIcon } from "lucide-react";
import { useState } from "react";
import {
  ChangelogSheet,
  type ChangeFieldConfig,
} from "@dafne/frontend-changelog/components/changelog-sheet";
import { Button } from "@dafne/frontend-ui/components/button";
import { getUserChanges } from "../actions.ts";

/**
 * The user's change log (Better Auth's writes: profile, email, role, ban,
 * verification), in a sheet opened by its button.
 */
export function UserChangelogButton({ userId }: { userId: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const role = (value: unknown) => {
    const key = typeof value === "string" ? value : "user";
    return t.has(`users.role.${key}` as never)
      ? t(`users.role.${key}` as "users.role.user")
      : key;
  };
  const fields: Record<string, ChangeFieldConfig> = {
    name: { label: t("users.fields.name") },
    firstname: { label: t("users.fields.firstname") },
    lastname: { label: t("users.fields.lastname") },
    email: { label: t("users.fields.email") },
    emailVerified: {
      label: t("users.fields.emailVerified"),
      value: (value) => (value ? t("users.verified") : t("users.notVerified")),
    },
    role: { label: t("users.fields.role"), value: role },
    banned: {
      label: t("users.fields.status"),
      value: (value) => (value ? t("users.status.banned") : t("users.status.active")),
    },
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <HistoryIcon data-icon="inline-start" />
        {t("changelog.open")}
      </Button>
      <ChangelogSheet
        open={open}
        onOpenChange={setOpen}
        load={(query) => getUserChanges(userId, query)}
        fields={fields}
      />
    </>
  );
}
