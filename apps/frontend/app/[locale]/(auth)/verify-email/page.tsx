import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifyEmail } from "./verify-email";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify");
  return { title: t("meta") };
}

/**
 * Shown after sign-up, after signing in with an unverified email, and when a
 * verification link fails (Better Auth adds `?error=...`). A link that works
 * signs the user in, so the proxy sends them on to the app instead.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <VerifyEmail />
    </Suspense>
  );
}
