"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@/lib/backend";
import type { UserDetail } from "@/lib/users";
import { userSchema, type UserFormValues } from "./schema";

/*
 * User mutations. The backend checks the session (forwarded by
 * backendFetch) and the admin role on every call, since these can be
 * invoked by any POST.
 */

export interface ActionError {
  error: string;
}

async function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) throw error;
  const t = await getTranslations();
  if (error.status === 401) return t("common.errors.sessionExpired");
  if (error.status === 403) return t("users.adminsOnly");
  // 409 (email taken) and 400 carry a message meant for the user, translated by the backend.
  return error.message || t("common.errors.generic");
}

/**
 * Creates a user with the password the admin picked (the backend emails
 * them a verification link), then opens their page. Returns an error
 * message when it fails.
 */
export async function createUser(values: UserFormValues): Promise<ActionError> {
  const parsed = userSchema.safeParse(values);
  if (!parsed.success)
    return { error: (await getTranslations())("common.errors.invalid") };

  let id: string;
  try {
    const res = await backendFetch("/users", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    id = ((await res.json()) as UserDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/users/${encodeURIComponent(id)}`);
}
