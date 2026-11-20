import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { getMyUserGroups } from "@dafne/frontend-user-groups/server";
import { requireUser } from "@/lib/session";
import { ProfileDetails } from "./profile-details";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default function AccountPage() {
  const t = useTranslations("account");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle className="text-xl">{t("title")}</PageContentTitle>
        <PageContentDescription>{t("description")}</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <Profile />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

async function Profile() {
  const [user, groups] = await Promise.all([requireUser(), getMyUserGroups()]);

  return <ProfileDetails user={user} groups={groups} />;
}
