"use server";

import { createServerValidate, ServerValidateError } from "@tanstack/react-form-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  signInFormOpts,
  signInSchema,
  signUpFormOpts,
  signUpSchema,
  type AuthFormState,
} from "@/app/(auth)/schemas";
import { SESSION_COOKIES } from "@/lib/auth-cookies";
import { applySetCookies, BackendError, backendFetch } from "@/lib/backend";

const validateSignIn = createServerValidate({
  ...signInFormOpts,
  onServerValidate: signInSchema,
});

const validateSignUp = createServerValidate({
  ...signUpFormOpts,
  onServerValidate: signUpSchema,
});

/** Never send the password back to the browser. */
function withoutPassword(state: AuthFormState): AuthFormState {
  const values = { ...(state.values ?? {}) } as Record<string, unknown>;
  delete values.password;
  return { ...state, values };
}

/** Form state with a form-level error from the server. */
function serverError(error: unknown, values: Record<string, unknown>): AuthFormState {
  let message = "Something went wrong. Please try again.";
  if (error instanceof BackendError) {
    message = error.status === 401 ? "Invalid email or password." : error.message;
  } else {
    console.error(error);
  }
  return withoutPassword({ values, errorMap: { onServer: message }, errors: [message] });
}

/**
 * Runs the server-side validation. Returns the values, or the form state
 * with the validation errors.
 */
async function validate<T>(
  run: () => Promise<T>,
): Promise<{ values: T } | { state: AuthFormState }> {
  try {
    return { values: await run() };
  } catch (error) {
    if (error instanceof ServerValidateError) return { state: withoutPassword(error.formState) };
    throw error;
  }
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await validate(() => validateSignIn(formData, { booleans: ["rememberMe"] }));
  if ("state" in result) return result.state;
  const { values } = result;

  try {
    const res = await backendFetch("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe === true,
      }),
    });
    await applySetCookies(res);
  } catch (error) {
    return serverError(error, values);
  }

  redirect("/");
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await validate(() => validateSignUp(formData));
  if ("state" in result) return result.state;
  const { values } = result;

  try {
    const res = await backendFetch("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({
        firstname: values.firstname.trim(),
        lastname: values.lastname.trim(),
        email: values.email,
        password: values.password,
      }),
    });
    await applySetCookies(res);
  } catch (error) {
    return serverError(error, values);
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
