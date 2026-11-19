import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { listUomOptions } from "@dafne/frontend-products/uoms/server";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { UomConversionForm } from "@dafne/frontend-products/uom-conversions/components/uom-conversion-form";
import { uomConversionsTable } from "@/lib/uom-conversions-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uomConversions.new") };
}

export default function NewUomConversionPage({
  searchParams,
}: PageProps<"/[locale]/uom-conversions/new">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("uomConversions.new")}</PageContentTitle>
        <PageContentDescription>
          {t("uomConversions.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        {/* The units are read per request; ?fromUomId= presets the first one. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <NewUomConversion searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

async function NewUomConversion({
  searchParams,
}: Pick<PageProps<"/[locale]/uom-conversions/new">, "searchParams">) {
  const { fromUomId } = await searchParams;
  return (
    <UomConversionForm
      units={await listUomOptions()}
      fromUomId={typeof fromUomId === "string" ? fromUomId : null}
      path={uomConversionsTable.path}
    />
  );
}
