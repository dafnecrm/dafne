import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackendError } from "@/lib/backend";
import { isAdmin, requireUser } from "@/lib/session";
import { getUser } from "@/lib/users";
import { NotAllowed } from "../not-allowed";
import { UserDetails } from "../user-detail";

export const metadata: Metadata = { title: "User" };

export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <UserProfile params={params} />
    </Suspense>
  );
}

/** Checks the role and fetches the user: name and avatar, then the details. */
async function UserProfile({
  params,
}: Pick<PageProps<"/users/[id]">, "params">) {
  if (!isAdmin(await requireUser()))
    return (
      <NotAllowed>You need the admin role to see user details.</NotAllowed>
    );

  const { id } = await params;
  let user;
  try {
    user = await getUser(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    // The backend checks the role too (e.g. it changed since sign-in).
    if (error instanceof BackendError && error.status === 403)
      return (
        <NotAllowed>You need the admin role to see user details.</NotAllowed>
      );
    throw error;
  }

  const initials =
    `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/users/${encodeURIComponent(user.id)}`}
        label={user.name}
      />
      <PageContentHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <PageContentTitle>{user.name}</PageContentTitle>
            <PageContentDescription>{user.email}</PageContentDescription>
          </div>
        </div>
        <PageContentAction>
          <Button
            variant="outline"
            size="sm"
            // Renders a link, not a <button>.
            nativeButton={false}
            render={<Link href="/users" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            All users
          </Button>
        </PageContentAction>
      </PageContentHeader>

      <PageContentBody>
        <UserDetails user={user} />
      </PageContentBody>
    </PageContent>
  );
}
