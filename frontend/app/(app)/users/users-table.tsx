"use client";

import Link from "next/link";
import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ListedUser } from "@/lib/users";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import { usersTable } from "@/lib/users-table";

/*
 * Columns of the users table. Column ids double as the backend's sort
 * fields, so they must match usersTable.sortable in lib/users-table.ts.
 */

const col = createDataTableColumnHelper<ListedUser>();

const empty = <span className="text-muted-foreground">—</span>;

// Module scope, so the table sees the same columns on every render.
const userColumns = col.columns([
  col.accessor("name", {
    header: "Name",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>
              {`${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link
            href={`/users/${encodeURIComponent(user.id)}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {user.name}
          </Link>
        </div>
      );
    },
  }),
  col.accessor("email", {
    header: "Email",
    cell: (info) => {
      const email = info.getValue();
      return email ? (
        <a
          href={`mailto:${email}`}
          className="underline-offset-4 hover:underline"
        >
          {email}
        </a>
      ) : (
        empty
      );
    },
  }),
  col.accessor("role", {
    header: "Role",
    enableSorting: false,
    cell: (info) => {
      const role = info.getValue() ?? "user";
      return (
        <Badge variant={role === "admin" ? "default" : "secondary"}>
          {role}
        </Badge>
      );
    },
  }),
  col.accessor("banned", {
    header: "Status",
    enableSorting: false,
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="destructive">Banned</Badge>
      ) : (
        <Badge variant="outline">Active</Badge>
      ),
  }),
  col.accessor("createdAt", {
    header: "Joined",
    meta: { className: "text-right" },
    cell: (info) => (
      <LocalDate value={info.getValue()} className="text-muted-foreground" />
    ),
  }),
]);

/** Row actions of the users table (DataTable `rowActions`). */
function userActions(user: ListedUser) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${user.email}`}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/users/${encodeURIComponent(user.id)}`} />}
        >
          <UserIcon />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(user.email)}
        >
          <CopyIcon />
          Copy email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
      rowActions={userActions}
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
