"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  createDataTableColumnHelper,
  useDescribeFilters,
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
import type { TableParams } from "@/lib/data-table";
import { usersTable } from "@/lib/users-table";

/*
 * Columns of the users table. Column ids double as the backend's sort
 * fields, so they must match usersTable.sortable in lib/users-table.ts.
 */

const col = createDataTableColumnHelper<ListedUser>();

const empty = <span className="text-muted-foreground">—</span>;

/** Translated per language; memoized, so the table sees the same columns on every render. */
function useUserColumns() {
  const t = useTranslations("users");
  return useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: t("fields.name"),
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
          header: t("fields.email"),
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
          header: t("fields.role"),
          enableSorting: false,
          cell: (info) => {
            const role = info.getValue() ?? "user";
            return (
              <Badge variant={role === "admin" ? "default" : "secondary"}>
                {t.has(`role.${role}` as never)
                  ? t(`role.${role}` as "role.user")
                  : role}
              </Badge>
            );
          },
        }),
        col.accessor("banned", {
          header: t("fields.status"),
          enableSorting: false,
          cell: (info) =>
            info.getValue() ? (
              <Badge variant="destructive">{t("status.banned")}</Badge>
            ) : (
              <Badge variant="outline">{t("status.active")}</Badge>
            ),
        }),
        col.accessor("createdAt", {
          header: t("fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t],
  );
}

/** Row actions of the users table, in a menu. */
function UserTableActions({ user }: { user: ListedUser }) {
  const t = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("actionsFor", { name: user.email })}
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
          {t("viewDetails")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(user.email)}
        >
          <CopyIcon />
          {t("copyEmail")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Module scope, so the table sees the same function on every render.
const userActions = (user: ListedUser) => <UserTableActions user={user} />;

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
  const t = useTranslations("users");
  const describeFilters = useDescribeFilters();
  const columns = useUserColumns();
  return (
    <DataTable
      columns={columns}
      data={users}
      getRowId={getRowId}
      config={usersTable}
      rowActions={userActions}
      params={params}
      total={total}
      noun={t("noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("empty.filtered", {
                    filter: describeFilters(params.filters, usersTable.filters),
                  })
                : t("empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
