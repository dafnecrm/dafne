import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { UomForm } from "@dafne/frontend-products/uoms/components/uom-form";
import { uomsTable } from "@/lib/uoms-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uoms.new") };
}

export default function NewUomPage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("uoms.new")}</PageContentTitle>
        <PageContentDescription>
          {t("uoms.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <UomForm path={uomsTable.path} />
      </PageContentBody>
    </PageContent>
  );
}

