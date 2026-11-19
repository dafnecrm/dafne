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
import { UomDetails } from "@dafne/frontend-products/uoms/components/uom-detail";
import { UomDetailActions } from "@dafne/frontend-products/uoms/components/uom-detail-actions";
import { uomsTable } from "@/lib/uoms-table";
import { loadUom } from "./load-uom";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uoms.singular") };
}

export default function UomPage({ params }: PageProps<"/[locale]/uoms/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <UomProfile params={params} />
    </Suspense>
  );
}

/** Loads the uom: its id and actions, then its details. */
async function UomProfile({
  params,
}: Pick<PageProps<"/[locale]/uoms/[id]">, "params">) {
  const uom = await loadUom((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${uomsTable.path}/${encodeURIComponent(uom.id)}`}
        label={`${t("uoms.singular")} ${uom.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("uoms.singular")} ${uom.id}`}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={uomsTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("uoms.all")}
          </Button>
          <UomDetailActions uom={uom} path={uomsTable.path} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <UomDetails uom={uom} />
      </PageContentBody>
    </PageContent>
  );
}
