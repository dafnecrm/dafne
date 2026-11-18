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
import { ChangePasswordForm } from "./change-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.password");
  return { title: t("title") };
}

export default function ChangePasswordPage() {
  const t = useTranslations("account.password");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle className="text-xl">{t("title")}</PageContentTitle>
        <PageContentDescription>{t("description")}</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ChangePasswordForm />
      </PageContentBody>
    </PageContent>
  );
}
