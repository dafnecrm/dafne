import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { isAdmin, requireUser } from "@/lib/session";
import { NotAllowed } from "../not-allowed";
import { UserForm } from "../user-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: t("new") };
}

export default function NewUserPage() {
  const t = useTranslations("users");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("new")}</PageContentTitle>
        <PageContentDescription>{t("newDescription")}</PageContentDescription>
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
  if (!isAdmin(await requireUser())) {
    const t = await getTranslations("users.notAllowed");
    return <NotAllowed>{t("create")}</NotAllowed>;
  }
  return <UserForm />;
}
