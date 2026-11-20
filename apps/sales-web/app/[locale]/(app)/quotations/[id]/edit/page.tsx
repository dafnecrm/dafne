import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { QuotationForm } from "@dafne/frontend-sales-orders/quotations/components/quotation-form";
import { quotationsTable } from "@/lib/quotations-table";
import { loadQuotation } from "../load-quotation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("quotations.editMeta") };
}

export default function EditQuotationPage({
  params,
}: PageProps<"/[locale]/quotations/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditQuotation params={params} />
    </Suspense>
  );
}

async function EditQuotation({
  params,
}: Pick<PageProps<"/[locale]/quotations/[id]/edit">, "params">) {
  const quotation = await loadQuotation((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${quotationsTable.path}/${encodeURIComponent(quotation.id)}`}
        label={`${t("quotations.singular")} ${quotation.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("quotations.singular")} ${quotation.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("quotations.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <QuotationForm quotation={quotation} path={quotationsTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
