import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DocumentPdfButton } from "@/components/document-pdf-button";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { QuotationDetails } from "@dafne/frontend-sales-orders/quotations/components/quotation-detail";
import { QuotationDetailActions } from "@dafne/frontend-sales-orders/quotations/components/quotation-detail-actions";
import { customersTable } from "@/lib/customers-table";
import { productsTable } from "@/lib/products-table";
import { quotationsTable } from "@/lib/quotations-table";
import { salesOrdersTable } from "@/lib/sales-orders-table";
import { loadQuotation } from "./load-quotation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("quotations.singular") };
}

export default function QuotationPage({
  params,
}: PageProps<"/[locale]/quotations/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <QuotationProfile params={params} />
    </Suspense>
  );
}

/** Loads the quotation: its id and actions, then its details. */
async function QuotationProfile({
  params,
}: Pick<PageProps<"/[locale]/quotations/[id]">, "params">) {
  const quotation = await loadQuotation((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${quotationsTable.path}/${encodeURIComponent(quotation.id)}`}
        label={`${t("quotations.singular")} ${quotation.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("quotations.singular")} ${quotation.id}`}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={quotationsTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("quotations.all")}
          </Button>
          {/* Only once a template is uploaded for quotations. */}
          <Suspense fallback={null}>
            <DocumentPdfButton resource="quotation" id={quotation.id} />
          </Suspense>
          <QuotationDetailActions
            quotation={quotation}
            path={quotationsTable.path}
            salesOrdersPath={salesOrdersTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <QuotationDetails
          quotation={quotation}
          customersPath={customersTable.path}
          productsPath={productsTable.path}
          salesOrdersPath={salesOrdersTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
