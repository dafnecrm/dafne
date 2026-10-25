"use client";

import { UsersIcon } from "lucide-react";
import {
  DataTable,
  describeFilters,
  type DataTableFilterDef,
} from "@/components/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { TableParams } from "@/lib/data-table";
import type { ListedUser, USER_FILTER_FIELDS } from "@/lib/users";
import { userColumns } from "./columns";

const getRowId = (user: ListedUser) => user.id;

/** One filter per backend filter field (USER_FILTER_FIELDS). */
const userFilters: readonly (DataTableFilterDef & {
  field: (typeof USER_FILTER_FIELDS)[number];
})[] = [
  { field: "email", label: "Email" },
  { field: "name", label: "Name" },
  {
    field: "role",
    label: "Role",
    placeholder: "Any role",
    options: [
      { value: "admin", label: "Admin" },
      { value: "user", label: "User" },
    ],
  },
  {
    field: "banned",
    label: "Status",
    placeholder: "Any status",
    options: [
      { value: "false", label: "Active" },
      { value: "true", label: "Banned" },
    ],
  },
];

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
      filters={userFilters}
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
                ? `No user where ${describeFilters(params.filters, userFilters)}.`
                : "Nobody has signed up yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
