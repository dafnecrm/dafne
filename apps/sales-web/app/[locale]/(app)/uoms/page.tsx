import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Can } from "@dafne/frontend-permissions";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { getTableParams } from "@dafne/frontend-data-table";
import { UomsTable } from "@dafne/frontend-products/uoms/components/uoms-table";
import { listUoms } from "@dafne/frontend-products/uoms/server";
import { uomsTable } from "@/lib/uoms-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uoms.title") };
}

export default function UomsPage({
  searchParams,
}: PageProps<"/[locale]/uoms">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("uoms.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Can I="create" a="Uom">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`${uomsTable.path}/new`} />}
            >
              <PlusIcon data-icon="inline-start" />
              {t("uoms.new")}
            </Button>
          </Can>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <UomsList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function UomsList({
  searchParams,
}: Pick<PageProps<"/[locale]/uoms">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, uomsTable);
  const data = await listUoms({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <UomsTable
      config={uomsTable}
      uoms={data.items}
      total={data.total}
      params={params}
    />
  );
}
