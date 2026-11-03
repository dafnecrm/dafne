import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";
import { AvatarUpload } from "./avatar-upload";
import { ProfileDetails } from "./profile-details";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";

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
  const user = await requireUser();

  return <ProfileDetails user={user} />;
}
