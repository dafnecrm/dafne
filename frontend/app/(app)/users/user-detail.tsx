import {
  ActivityIcon,
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
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserDetail, UserSession } from "@/lib/users";

/** The details of a user: profile, access, sign-in methods, sessions and record. */
export function UserDetails({ user }: { user: UserDetail }) {
  const role = user.role ?? "user";

  return (
    <>
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
    </>
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
