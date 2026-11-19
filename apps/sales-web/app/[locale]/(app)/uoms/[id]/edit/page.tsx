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
import { UomForm } from "@dafne/frontend-products/uoms/components/uom-form";
import { uomsTable } from "@/lib/uoms-table";
import { loadUom } from "../load-uom";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uoms.editMeta") };
}

export default function EditUomPage({
  params,
}: PageProps<"/[locale]/uoms/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditUom params={params} />
    </Suspense>
  );
}

async function EditUom({
  params,
}: Pick<PageProps<"/[locale]/uoms/[id]/edit">, "params">) {
  const uom = await loadUom((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${uomsTable.path}/${encodeURIComponent(uom.id)}`}
        label={`${t("uoms.singular")} ${uom.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", { name: `${t("uoms.singular")} ${uom.id}` })}
        </PageContentTitle>
        <PageContentDescription>
          {t("uoms.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <UomForm uom={uom} path={uomsTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
