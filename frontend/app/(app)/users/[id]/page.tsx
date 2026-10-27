import {
  ActivityIcon,
  ArrowLeftIcon,
  BanIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  FingerprintIcon,
  HistoryIcon,
  KeyRoundIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";
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
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackendError } from "@/lib/backend";
import { isAdmin, requireUser } from "@/lib/session";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUser, type UserDetail, type UserSession } from "@/lib/users";
import { NotAllowed } from "../not-allowed";
import CopyButton from "@/components/copy-button";

export const metadata: Metadata = { title: "User" };

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
        <DetailSection title="Profile">
          <Detail icon={UserIcon} label="First name">
            {user.firstname}
          </Detail>
          <Detail icon={UserIcon} label="Last name">
            {user.lastname}
          </Detail>
          <Detail icon={MailIcon} label="Email">
            <span className="flex flex-wrap items-center gap-2">
              {user.email}
              {user.emailVerified ? (
                <Badge variant="outline">Verified</Badge>
              ) : (
                <Badge variant="secondary">Not verified</Badge>
              )}
            </span>
          </Detail>
          <Detail icon={ShieldIcon} label="Role">
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {role}
            </Badge>
          </Detail>
        </DetailSection>

        <DetailSection title="Access">
          <Detail icon={user.banned ? BanIcon : CircleCheckIcon} label="Status">
            {user.banned ? (
              <Badge variant="destructive">Banned</Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </Detail>
          {user.banned && (
            <Detail icon={CircleAlertIcon} label="Ban reason">
              {user.banReason || "—"}
            </Detail>
          )}
          {user.banned && (
            <Detail icon={CalendarClockIcon} label="Ban expires">
              {user.banExpires ? (
                <LocalDate value={user.banExpires} format="dateTime" />
              ) : (
                "Never"
              )}
            </Detail>
          )}
          <Detail icon={ActivityIcon} label="Last active">
            {user.lastActiveAt ? (
              <LocalDate value={user.lastActiveAt} format="dateTime" />
            ) : (
              "Never"
            )}
          </Detail>
        </DetailSection>

        <DetailSection title="Sign-in methods">
          {user.accounts.length ? (
            user.accounts.map((account) => (
              <Detail
                key={account.id}
                icon={KeyRoundIcon}
                label={providerLabel(account.providerId)}
              >
                <span className="text-muted-foreground font-normal">
                  Linked <LocalDate value={account.createdAt} format="dateTime" />
                </span>
              </Detail>
            ))
          ) : (
            <Detail icon={KeyRoundIcon} label="Accounts">
              None
            </Detail>
          )}
        </DetailSection>

        <UserSessions sessions={user.sessions} />

        <DetailSection title="Record">
          <Detail icon={FingerprintIcon} label="User ID">
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs truncate">{user.id}</code>
              <CopyButton variant="ghost" value={user.id} />
            </div>
          </Detail>
          <Detail icon={CalendarPlusIcon} label="Joined">
            <LocalDate value={user.createdAt} format="dateTime" />
          </Detail>
          <Detail icon={HistoryIcon} label="Updated">
            <LocalDate value={user.updatedAt} format="dateTime" />
          </Detail>
        </DetailSection>
      </PageContentBody>
    </PageContent>
  );
}

/** The user's active Better Auth sessions, most recently used first. */
function UserSessions({ sessions }: { sessions: UserSession[] }) {
  return (
    <DetailSection title={`Active sessions (${sessions.length})`} groupClassName="w-full">
      {sessions.length ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP address</TableHead>
                <TableHead>Signed in</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <span
                      className="flex items-center gap-2"
                      title={session.userAgent ?? undefined}
                    >
                      <MonitorSmartphoneIcon className="text-muted-foreground size-4 shrink-0" />
                      {describeUserAgent(session.userAgent)}
                      {session.impersonatedBy && (
                        <Badge variant="secondary">Impersonated</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {session.ipAddress || "—"}
                  </TableCell>
                  <TableCell>
                    <LocalDate value={session.createdAt} format="dateTime" />
                  </TableCell>
                  <TableCell>
                    <LocalDate value={session.updatedAt} format="dateTime" />
                  </TableCell>
                  <TableCell>
                    <LocalDate value={session.expiresAt} format="dateTime" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No active sessions.</p>
      )}
    </DetailSection>
  );
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

/** "Mozilla/5.0 (Macintosh; …) … Chrome/130…" → "Chrome on macOS". */
function describeUserAgent(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const match = (list: [RegExp, string][]) =>
    list.find(([pattern]) => pattern.test(userAgent))?.[1];
  const browser = match(BROWSERS);
  const os = match(SYSTEMS);
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? userAgent;
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
