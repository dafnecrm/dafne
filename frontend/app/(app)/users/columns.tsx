"use client";

import { createDataTableColumnHelper } from "@/components/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ListedUser } from "@/lib/users";

/*
 * Columns of the users table. Column ids double as the backend's sort
 * fields, so they must match USER_SORT_FIELDS in lib/users.ts.
 */

const col = createDataTableColumnHelper<ListedUser>();

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
          <span className="font-medium">{user.name}</span>
        </div>
      );
    },
  }),
  col.accessor("email", { header: "Email" }),
  col.accessor("role", {
    header: "Role",
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
      <span className="text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  }),
]);
