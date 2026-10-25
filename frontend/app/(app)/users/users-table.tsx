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
import type { TableParams } from "@/lib/data-table";
import type { ListedUser } from "@/lib/users";
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
      path="/users"
      params={params}
      total={total}
      searchPlaceholder="Search by email"
      noun="users"
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>
              {params.search
                ? `No email contains “${params.search}”.`
                : "Nobody has signed up yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
