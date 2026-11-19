import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
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
import { UomConversionDetails } from "@dafne/frontend-products/uom-conversions/components/uom-conversion-detail";
import { UomConversionDetailActions } from "@dafne/frontend-products/uom-conversions/components/uom-conversion-detail-actions";
import { uomConversionsTable } from "@/lib/uom-conversions-table";
import { loadUomConversion } from "./load-uom-conversion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uomConversions.singular") };
}

export default function UomConversionPage({
  params,
}: PageProps<"/[locale]/uom-conversions/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <UomConversionProfile params={params} />
    </Suspense>
  );
}

/** Loads the uom conversion: its id and actions, then its details. */
async function UomConversionProfile({
  params,
}: Pick<PageProps<"/[locale]/uom-conversions/[id]">, "params">) {
  const uomConversion = await loadUomConversion((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${uomConversionsTable.path}/${encodeURIComponent(uomConversion.id)}`}
        label={`${t("uomConversions.singular")} ${uomConversion.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("uomConversions.singular")} ${uomConversion.id}`}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={uomConversionsTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("uomConversions.all")}
          </Button>
          <UomConversionDetailActions
            uomConversion={uomConversion}
            path={uomConversionsTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <UomConversionDetails uomConversion={uomConversion} />
      </PageContentBody>
    </PageContent>
  );
}
