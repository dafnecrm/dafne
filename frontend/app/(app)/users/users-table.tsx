"use client";

import { UsersIcon } from "lucide-react";
import { DataTable } from "@/components/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import type { ListedUser } from "@/lib/users";
import { usersTable } from "@/lib/users-table";
import { userColumns } from "./columns";

const getRowId = (user: ListedUser) => user.id;

/** Users list; the server page passes one page of users. */
export function UsersTable({
  users,
  total,
  params,
}: {
  users: ListedUser[];
  total: number;
  params: TableParams;
}) {
  return (
    <DataTable
      columns={userColumns}
      data={users}
      getRowId={getRowId}
      config={usersTable}
      params={params}
      total={total}
      noun="users"
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? `No user where ${describeFilters(params.filters, usersTable.filters)}.`
                : "Nobody has signed up yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
