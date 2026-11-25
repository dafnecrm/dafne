import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser, isAdmin } from "@/lib/session";

/**
 * The scheduled tasks: admins only, anyone else gets a 404. apps/sales-tasks
 * checks it again on every call.
 */
export default function TasksLayout({ children }: { children: ReactNode }) {
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
