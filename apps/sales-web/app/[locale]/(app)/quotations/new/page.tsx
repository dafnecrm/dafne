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
import { Suspense } from "react";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { QuotationForm } from "@dafne/frontend-sales-orders/quotations/components/quotation-form";
import { getQuotationNextStatuses } from "@dafne/frontend-sales-orders/quotations/server";
import { quotationsTable } from "@/lib/quotations-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("quotations.new") };
}

export default function NewQuotationPage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("quotations.new")}</PageContentTitle>
        <PageContentDescription>
          {t("quotations.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        {/* The statuses are read per request; the form reads ?customerId= (useSearchParams). */}
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <NewQuotationForm />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Loads the statuses a draft can move to (the status select's options), then the form. */
async function NewQuotationForm() {
  const nextStatuses = await getQuotationNextStatuses("draft");
  return (
    <QuotationForm path={quotationsTable.path} nextStatuses={nextStatuses} />
  );
}
