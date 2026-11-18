"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authFetch, BackendError, backendFetch } from "@dafne/frontend-api/server";
import { userGroupSchema, type UserGroupFormValues } from "./schema.ts";
import type { UserGroupDetail } from "./types.ts";

/*
 * User group mutations shared by the apps. The backend checks the session
 * (forwarded by backendFetch) on every call, since these can be invoked by
 * any POST.
 */

export interface ActionError {
  error: string;
}

/** The error to show; the backend's own message is already translated. */
async function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) {
    throw error;
  }
  const t = await getTranslations();
  if (error.status === 401) {
    return t("common.errors.sessionExpired");
  }
  if (error.status === 404) {
    return t("userGroups.notFound");
  }
  return error.message || t("common.errors.generic");
}

/**
 * Creates an user group (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's user groups list). Returns an
 * error message when it fails.
 */
export async function saveUserGroup(
  id: UserGroupDetail["id"] | null,
  values: UserGroupFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = userGroupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid") };
  }

  let savedId: UserGroupDetail["id"];
  try {
    const res = await backendFetch(
      id ? `/user-groups/${encodeURIComponent(id)}` : "/user-groups",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as UserGroupDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the user group as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Deletes an user group (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteUserGroup(
  id: UserGroupDetail["id"],
): Promise<ActionError | null> {
  try {
    await backendFetch(`/user-groups/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

/** A user as the members picker shows them. */
export interface UserOption {
  id: string;
  name: string;
  email: string;
}

/**
 * Users whose name or email contains `search`, for the members picker:
 * apps/auth's GET /users (admins and super-admins), by name and by email.
 */
export async function searchUsers(search: string, limit = 20): Promise<UserOption[]> {
  const query = search.trim();
  const page = async (filter: "name" | "email" | null) => {
    const params = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 100)), sortBy: "name", sortDirection: "asc" });
    if (filter && query) {
      params.set(filter, query);
    }
    const res = await authFetch(`/users?${params}`);
    return ((await res.json()) as { items: UserOption[] }).items;
  };
  const lists = query ? await Promise.all([page("name"), page("email")]) : [await page(null)];
  const byId = new Map(lists.flat().map(({ id, name, email }) => [id, { id, name, email }]));
  return [...byId.values()].slice(0, limit);
}
