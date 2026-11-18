import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";

/**
 * Pages for super-admins only (the AI assistant's providers, models and
 * agents): anyone else gets a 404. The backend checks it again
 * (`@SuperAdmin()`) on every call.
 */
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  // The session is read per request.
  return (
    <Suspense fallback={null}>
      <SuperAdminOnly>{children}</SuperAdminOnly>
    </Suspense>
  );
}

async function SuperAdminOnly({ children }: { children: ReactNode }) {
  if (!isSuperAdmin(await getCurrentUser())) {
    notFound();
  }
  return children;
}
