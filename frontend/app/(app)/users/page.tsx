import { ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { BackendError } from "@/lib/backend";
import { getTableParams } from "@/lib/data-table";
import { isAdmin, requireUser } from "@/lib/session";
import {
  DEFAULT_USER_SORT,
  listUsers,
  USER_FILTER_FIELDS,
  USER_SORT_FIELDS,
} from "@/lib/users";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Users · Tiny CRM" };

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

  const params = getTableParams(await searchParams, {
    sortable: USER_SORT_FIELDS,
    filterable: USER_FILTER_FIELDS,
    defaultSort: DEFAULT_USER_SORT,
  });
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

function NotAllowed() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Admins only</EmptyTitle>
        <EmptyDescription>
          You need the admin role to see the list of users.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
