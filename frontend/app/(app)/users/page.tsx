import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { BackendError } from "@/lib/backend";
import { getTableParams } from "@/lib/data-table";
import { isAdmin, requireUser } from "@/lib/session";
import { listUsers } from "@/lib/users";
import { usersTable } from "@/lib/users-table";
import { NotAllowed } from "./not-allowed";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage({ searchParams }: PageProps<"/users">) {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>Users</PageContentTitle>
        <PageContentDescription>
          Everyone with an account. Filter by a field, or click a column to
          sort.
        </PageContentDescription>
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
}: Pick<PageProps<"/users">, "searchParams">) {
  if (!isAdmin(await requireUser())) return <NotAllowed />;

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
    if (error instanceof BackendError && error.status === 403)
      return <NotAllowed />;
    throw error;
  }

  return <UsersTable users={data.users} total={data.total} params={params} />;
}
