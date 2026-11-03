import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin, requireUser } from "@/lib/session";
import { NotAllowed } from "../not-allowed";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "New user" };

export default function NewUserPage() {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>New user</PageContentTitle>
        <PageContentDescription>
          The user gets an email with a verification link, and can sign in
          once they click it.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        {/* The session is read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <AdminOnlyForm />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** The form for admins; the backend checks the role again on save. */
async function AdminOnlyForm() {
  if (!isAdmin(await requireUser()))
    return <NotAllowed>You need the admin role to create users.</NotAllowed>;
  return <UserForm />;
}
