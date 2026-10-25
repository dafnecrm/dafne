"use server";

import { refresh } from "next/cache";
import { isValidAvatar } from "@/lib/avatar";
import { applySetCookies, BackendError, backendFetch } from "@/lib/backend";

export interface AvatarResult {
  error?: string;
}

/** Sets the signed-in user's avatar, or removes it when `image` is null. */
export async function updateAvatar(image: string | null): Promise<AvatarResult> {
  if (image !== null && !isValidAvatar(image)) {
    return { error: "This image can't be used. Pick a PNG, JPEG or WebP image." };
  }

  try {
    // Better Auth endpoint; the session cookie identifies the user.
    const res = await backendFetch("/api/auth/update-user", {
      method: "POST",
      body: JSON.stringify({ image }),
    });
    await applySetCookies(res);
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      return { error: "Your session has expired. Sign in again." };
    }
    console.error("Avatar update failed", error);
    return { error: "Couldn't save your avatar. Please try again." };
  }

  // Re-render the page and the header with the new image.
  refresh();
  return {};
}
