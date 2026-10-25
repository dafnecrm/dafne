"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { applySetCookies, BackendError, backendFetch } from "@/lib/backend";
import { SESSION_COOKIES } from "@/lib/auth-cookies";

export interface AuthFormState {
  error?: string;
  /** Submitted values, so the form keeps them after an error. */
  values?: Record<string, string>;
}

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

function errorMessage(error: unknown) {
  if (error instanceof BackendError) {
    if (error.status === 401) return "Invalid email or password.";
    return error.message;
  }
  console.error(error);
  return "Something went wrong. Please try again.";
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email");

  try {
    const res = await backendFetch("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: String(formData.get("password") ?? ""),
        rememberMe: formData.get("rememberMe") === "on",
      }),
    });
    await applySetCookies(res);
  } catch (error) {
    return { error: errorMessage(error), values: { email } };
  }

  redirect("/");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    firstname: field(formData, "firstname"),
    lastname: field(formData, "lastname"),
    email: field(formData, "email"),
  };

  try {
    const res = await backendFetch("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({
        ...values,
        password: String(formData.get("password") ?? ""),
      }),
    });
    await applySetCookies(res);
  } catch (error) {
    return { error: errorMessage(error), values };
  }

  redirect("/");
}

export async function signOut() {
  try {
    const res = await backendFetch("/api/auth/sign-out", {
      method: "POST",
      body: "{}",
    });
    await applySetCookies(res);
  } catch (error) {
    console.error("Sign-out failed on the backend", error);
  }

  // Clear the session cookie locally even if the backend call failed.
  const cookieStore = await cookies();
  for (const name of SESSION_COOKIES) cookieStore.delete(name);

  redirect("/sign-in");
}
