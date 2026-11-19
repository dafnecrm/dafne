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
import { listUomOptions } from "@dafne/frontend-products/uoms/server";
import { UomConversionForm } from "@dafne/frontend-products/uom-conversions/components/uom-conversion-form";
import { uomConversionsTable } from "@/lib/uom-conversions-table";
import { loadUomConversion } from "../load-uom-conversion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uomConversions.editMeta") };
}

export default function EditUomConversionPage({
  params,
}: PageProps<"/[locale]/uom-conversions/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditUomConversion params={params} />
    </Suspense>
  );
}

async function EditUomConversion({
  params,
}: Pick<PageProps<"/[locale]/uom-conversions/[id]/edit">, "params">) {
  const { id } = await params;
  const [uomConversion, units] = await Promise.all([
    loadUomConversion(id),
    listUomOptions(),
  ]);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${uomConversionsTable.path}/${encodeURIComponent(uomConversion.id)}`}
        label={`${t("uomConversions.singular")} ${uomConversion.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("uomConversions.singular")} ${uomConversion.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("uomConversions.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <UomConversionForm
          units={units}
          uomConversion={uomConversion}
          path={uomConversionsTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
