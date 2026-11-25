import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { BackendError } from "@dafne/frontend-api";
import { getTableParams } from "@dafne/frontend-data-table";
import { isAdmin, requireUser } from "@/lib/session";
import { NotAllowed } from "@dafne/frontend-users/components/not-allowed";
import { UsersTable } from "@dafne/frontend-users/components/users-table";
import { listUsers } from "@dafne/frontend-users/server";
import { usersTable } from "@/lib/users-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: t("title") };
}

export default function UsersPage({
  searchParams,
}: PageProps<"/[locale]/admin/users">) {
  const t = useTranslations("users");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("title")}</PageContentTitle>
        <PageContentDescription>{t("listDescription")}</PageContentDescription>
        <PageContentAction>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`${usersTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <UsersList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Checks the role and fetches one page; the client table renders it. */
async function UsersList({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/users">, "searchParams">) {
  if (!isAdmin(await requireUser())) {
    return <NotAllowed />;
  }

  const params = getTableParams(await searchParams, usersTable);
  let data;
  try {
    data = await listUsers({
      limit: params.pageSize,
      offset: params.offset,
      filters: params.filters,
      sort: params.sort,
    });
  } catch (error) {
    // The backend checks the role too (e.g. it changed since sign-in).
    if (error instanceof BackendError && error.status === 403) {
      return <NotAllowed />;
    }
    throw error;
  }

  return (
    <UsersTable
      users={data.items}
      total={data.total}
      params={params}
      config={usersTable}
    />
  );
}
