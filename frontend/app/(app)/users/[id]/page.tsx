import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { LocalDate } from "@/components/local-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackendError } from "@/lib/backend";
import { isAdmin, requireUser } from "@/lib/session";
import { getUser, type UserDetail } from "@/lib/users";
import { NotAllowed } from "../not-allowed";

export const metadata: Metadata = { title: "User · Tiny CRM" };

export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <UserDetails params={params} />
    </Suspense>
  );
}

/** Checks the role and fetches the user. */
async function UserDetails({
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

  return <UserProfile user={user} />;
}

function UserProfile({ user }: { user: UserDetail }) {
  const role = user.role ?? "user";
  const initials =
    `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase();

  return (
    <PageContent>
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
          <Button variant="outline" size="sm" render={<Link href="/users" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            All users
          </Button>
        </PageContentAction>
      </PageContentHeader>

      <PageContentBody className="flex flex-col gap-6">
        <DetailSection title="Profile">
          <Detail label="First name">{user.firstname}</Detail>
          <Detail label="Last name">{user.lastname}</Detail>
          <Detail label="Email">
            <span className="flex flex-wrap items-center gap-2">
              {user.email}
              {user.emailVerified ? (
                <Badge variant="outline">Verified</Badge>
              ) : (
                <Badge variant="secondary">Not verified</Badge>
              )}
            </span>
          </Detail>
          <Detail label="Role">
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {role}
            </Badge>
          </Detail>
        </DetailSection>

        <DetailSection title="Access">
          <Detail label="Status">
            {user.banned ? (
              <Badge variant="destructive">Banned</Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </Detail>
          {user.banned && (
            <>
              <Detail label="Ban reason">{user.banReason || "—"}</Detail>
              <Detail label="Ban expires">
                {user.banExpires ? (
                  <LocalDate value={user.banExpires} format="dateTime" />
                ) : (
                  "Never"
                )}
              </Detail>
            </>
          )}
          <Detail label="Sign-in methods">
            {user.providers.length ? (
              <span className="flex flex-wrap gap-1">
                {user.providers.map((provider) => (
                  <Badge key={provider} variant="outline">
                    {providerLabel(provider)}
                  </Badge>
                ))}
              </span>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Last active">
            {user.lastActiveAt ? (
              <LocalDate value={user.lastActiveAt} format="dateTime" />
            ) : (
              "Never"
            )}
          </Detail>
        </DetailSection>

        <DetailSection title="Record">
          <Detail label="Joined">
            <LocalDate value={user.createdAt} format="dateTime" />
          </Detail>
          <Detail label="Updated">
            <LocalDate value={user.updatedAt} format="dateTime" />
          </Detail>
          <Detail label="User ID">
            <code className="font-mono text-xs break-all">{user.id}</code>
          </Detail>
        </DetailSection>
      </PageContentBody>
    </PageContent>
  );
}

/** A titled, bordered list of label / value rows. */
function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-medium">{title}</h2>
      <dl className="divide-y rounded-lg border">{children}</dl>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  credential: "Email and password",
};

/** "credential" → "Email and password", "google" → "Google". */
function providerLabel(provider: string) {
  return (
    PROVIDER_LABELS[provider] ??
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}
