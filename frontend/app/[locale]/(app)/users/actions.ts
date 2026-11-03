"use server";

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

function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) throw error;
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 403) return "Only admins can create users.";
  // 409 (email taken) and 400 carry a message meant for the user.
  return error.message || "Something went wrong. Please try again.";
}

/**
 * Creates a user with the password the admin picked (the backend emails
 * them a verification link), then opens their page. Returns an error
 * message when it fails.
 */
export async function createUser(values: UserFormValues): Promise<ActionError> {
  const parsed = userSchema.safeParse(values);
  if (!parsed.success) return { error: "Some fields are not valid." };

  let id: string;
  try {
    const res = await backendFetch("/users", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    id = ((await res.json()) as UserDetail).id;
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/users/${encodeURIComponent(id)}`);
}
