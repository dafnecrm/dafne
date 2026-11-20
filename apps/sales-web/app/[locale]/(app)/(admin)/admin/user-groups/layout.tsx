import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser, isAdmin } from "@/lib/session";

/**
 * User groups and their permissions: admins only, anyone else gets a 404.
 * The backends check it again on every call: apps/auth for the groups and
 * their members (shared by every app), the API for their permissions here.
 */
export default function UserGroupsLayout({ children }: { children: ReactNode }) {
  // The session is read per request.
  return (
    <Suspense fallback={null}>
      <AdminOnly>{children}</AdminOnly>
    </Suspense>
  );
}

async function AdminOnly({ children }: { children: ReactNode }) {
  if (!isAdmin(await getCurrentUser())) {
    notFound();
  }
  return children;
}
