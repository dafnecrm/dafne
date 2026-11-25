import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { listTemplatesFor } from "@dafne/frontend-documents/server";
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

/**
 * Loads the quotation and its PDF templates: its id and actions (the PDF
 * among them, once a template is uploaded for quotations), then its details.
 */
async function QuotationProfile({
  params,
}: Pick<PageProps<"/[locale]/quotations/[id]">, "params">) {
  const { id } = await params;
  const [quotation, templates, t] = await Promise.all([
    loadQuotation(id),
    listTemplatesFor("quotation"),
    getTranslations(),
  ]);

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
          <QuotationDetailActions
            quotation={quotation}
            path={quotationsTable.path}
            salesOrdersPath={salesOrdersTable.path}
            pdfTemplates={templates.map(({ id: templateId, name, isDefault, language }) => ({
              id: templateId,
              name,
              isDefault,
              language,
            }))}
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
