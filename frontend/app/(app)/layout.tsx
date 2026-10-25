import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { UserMenu } from "@/components/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

/** Layout for pages that need a signed-in user. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-muted">
      <header className="flex h-14 items-center justify-between border-b bg-background px-6">
        <Link href="/" className="font-heading text-base font-semibold">
          Tiny CRM
        </Link>
        {/* The session is read per request, so the user streams in behind a boundary. */}
        <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
          <HeaderUser />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}

async function HeaderUser() {
  const { name, firstname, lastname, email, image } = await requireUser();
  return <UserMenu user={{ name, firstname, lastname, email, image }} />;
}
