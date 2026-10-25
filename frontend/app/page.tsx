import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-muted">
      <header className="flex h-14 items-center justify-between border-b bg-background px-6">
        <span className="font-heading text-base font-semibold">Tiny CRM</span>
        {/* The session is read per request, so these parts stream in behind boundaries. */}
        <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
          <HeaderUser />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
          <Welcome />
        </Suspense>
      </main>
    </div>
  );
}

async function HeaderUser() {
  const { name, firstname, lastname, email } = await requireUser();
  return <UserMenu user={{ name, firstname, lastname, email }} />;
}

async function Welcome() {
  const user = await requireUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome, {user.firstname}</CardTitle>
        <CardDescription>Signed in as {user.email}</CardDescription>
      </CardHeader>
    </Card>
  );
}
