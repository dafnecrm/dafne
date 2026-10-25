import { SearchIcon, ShieldAlertIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BackendError } from "@/lib/backend";
import { isAdmin, requireUser } from "@/lib/session";
import { listUsers, type ListedUser } from "@/lib/users";

export const metadata: Metadata = { title: "Users · Tiny CRM" };

const PAGE_SIZE = 20;

export default function UsersPage({ searchParams }: PageProps<"/users">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Users</CardTitle>
        <CardDescription>
          Everyone with an account, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <UsersList searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function UsersList({
  searchParams,
}: Pick<PageProps<"/users">, "searchParams">) {
  if (!isAdmin(await requireUser())) return <NotAllowed />;

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  let data;
  try {
    data = await listUsers({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      search,
    });
  } catch (error) {
    // The backend checks the role too (e.g. it changed since sign-in).
    if (error instanceof BackendError && error.status === 403)
      return <NotAllowed />;
    throw error;
  }

  const first = data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(page * PAGE_SIZE, data.total);
  const pageHref = (p: number) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (p > 1) query.set("page", String(p));
    const qs = query.toString();
    return qs ? `/users?${qs}` : "/users";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* GET form: the search ends up in the URL (?q=), so it can be shared. */}
      <Form action="/users" className="flex max-w-sm gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Search by email"
          aria-label="Search by email"
        />
        <Button type="submit" variant="outline">
          <SearchIcon data-icon="inline-start" />
          Search
        </Button>
      </Form>

      {data.users.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>
              {search
                ? `No email contains “${search}”.`
                : "Nobody has signed up yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {data.total ? `${first}–${last} of ${data.total}` : "0 users"}
        </span>
        <div className="flex gap-2">
          <PageLink href={page > 1 ? pageHref(page - 1) : undefined}>
            Previous
          </PageLink>
          <PageLink href={last < data.total ? pageHref(page + 1) : undefined}>
            Next
          </PageLink>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user }: { user: ListedUser }) {
  const initials =
    `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase();
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </div>
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role ?? "user"}
        </Badge>
      </TableCell>
      <TableCell>
        {user.banned ? (
          <Badge variant="destructive">Banned</Badge>
        ) : (
          <Badge variant="outline">Active</Badge>
        )}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </TableCell>
    </TableRow>
  );
}

/** Previous/Next button; disabled without an href. */
function PageLink({ href, children }: { href?: string; children: string }) {
  if (!href) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      render={<Link href={href} />}
      nativeButton={false}
    >
      {children}
    </Button>
  );
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
