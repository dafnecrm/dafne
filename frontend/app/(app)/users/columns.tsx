"use client";

import Link from "next/link";
import { createDataTableColumnHelper } from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ListedUser } from "@/lib/users";

/*
 * Columns of the users table. Column ids double as the backend's sort
 * fields, so they must match usersTable.sortable in lib/users-table.ts.
 */

const col = createDataTableColumnHelper<ListedUser>();

const empty = <span className="text-muted-foreground">—</span>;

// Module scope, so the table sees the same columns on every render.
export const userColumns = col.columns([
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
        <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
          {email}
        </a>
      ) : (
        empty
      );
    }
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
