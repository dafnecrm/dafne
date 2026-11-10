import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { ActivityForm } from "@dafne/frontend-activities/components/activity-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities");
  return { title: t("new") };
}

export default function NewActivityPage() {
  const t = useTranslations("activities");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("new")}</PageContentTitle>
        <PageContentDescription>{t("newDescription")}</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ActivityForm />
      </PageContentBody>
    </PageContent>
  );
}
