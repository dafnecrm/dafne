import { useTranslations } from "next-intl";
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
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { Badge } from "@dafne/frontend-ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dafne/frontend-ui/components/table";
import type { UserDetail, UserSession } from "@/lib/users";

/** The details of a user: profile, access, sign-in methods, sessions and record. */
export function UserDetails({ user }: { user: UserDetail }) {
  const t = useTranslations();
  const role = user.role ?? "user";

  return (
    <>
      <DetailSection title={t("users.sections.profile")}>
        <Detail icon={UserIcon} label={t("users.fields.firstname")}>
          {user.firstname}
        </Detail>
        <Detail icon={UserIcon} label={t("users.fields.lastname")}>
          {user.lastname}
        </Detail>
        <Detail icon={MailIcon} label={t("users.fields.email")}>
          <span className="flex flex-wrap items-center gap-2">
            {user.email}
            {user.emailVerified ? (
              <Badge variant="outline">{t("users.verified")}</Badge>
            ) : (
              <Badge variant="secondary">{t("users.notVerified")}</Badge>
            )}
          </span>
        </Detail>
        <Detail icon={ShieldIcon} label={t("users.fields.role")}>
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {t.has(`users.role.${role}` as never)
              ? t(`users.role.${role}` as "users.role.user")
              : role}
          </Badge>
        </Detail>
      </DetailSection>

      <DetailSection title={t("users.sections.access")}>
        <Detail
          icon={user.banned ? BanIcon : CircleCheckIcon}
          label={t("users.fields.status")}
        >
          {user.banned ? (
            <Badge variant="destructive">{t("users.status.banned")}</Badge>
          ) : (
            <Badge variant="outline">{t("users.status.active")}</Badge>
          )}
        </Detail>
        {user.banned && (
          <Detail icon={CircleAlertIcon} label={t("users.fields.banReason")}>
            {user.banReason || "—"}
          </Detail>
        )}
        {user.banned && (
          <Detail icon={CalendarClockIcon} label={t("users.fields.banExpires")}>
            {user.banExpires ? (
              <LocalDate value={user.banExpires} format="dateTime" />
            ) : (
              t("users.never")
            )}
          </Detail>
        )}
        <Detail icon={ActivityIcon} label={t("users.fields.lastActive")}>
          {user.lastActiveAt ? (
            <LocalDate value={user.lastActiveAt} format="dateTime" />
          ) : (
            t("users.never")
          )}
        </Detail>
      </DetailSection>

      <DetailSection title={t("users.sections.signInMethods")}>
        {user.accounts.length ? (
          user.accounts.map((account) => (
            <Detail
              key={account.id}
              icon={KeyRoundIcon}
              label={providerLabel(
                account.providerId,
                t("users.providers.credential"),
              )}
            >
              <span className="text-muted-foreground font-normal">
                {t("users.linked")}{" "}
                <LocalDate value={account.createdAt} format="dateTime" />
              </span>
            </Detail>
          ))
        ) : (
          <Detail icon={KeyRoundIcon} label={t("users.fields.accounts")}>
            {t("users.none")}
          </Detail>
        )}
      </DetailSection>

      <UserSessions sessions={user.sessions} />

      <DetailSection title={t("common.record.title")}>
        <Detail icon={FingerprintIcon} label={t("users.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs truncate">{user.id}</code>
            <CopyButton variant="ghost" value={user.id} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("users.fields.createdAt")}>
          <LocalDate value={user.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={user.updatedAt} format="dateTime" />
        </Detail>
      </DetailSection>
    </>
  );
}

/** The user's active Better Auth sessions, most recently used first. */
function UserSessions({ sessions }: { sessions: UserSession[] }) {
  const t = useTranslations("users");
  return (
    <DetailSection
      title={t("sections.sessions", { count: sessions.length })}
      groupClassName="flex"
    >
      {sessions.length ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sessions.device")}</TableHead>
                <TableHead>{t("sessions.ip")}</TableHead>
                <TableHead>{t("sessions.signedIn")}</TableHead>
                <TableHead>{t("sessions.lastActive")}</TableHead>
                <TableHead>{t("sessions.expires")}</TableHead>
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
                      {describeUserAgent(session.userAgent, t)}
                      {session.impersonatedBy && (
                        <Badge variant="secondary">
                          {t("sessions.impersonated")}
                        </Badge>
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
        <p className="text-muted-foreground text-sm">{t("sessions.none")}</p>
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

type UsersT = ReturnType<typeof useTranslations<"users">>;

/** "Mozilla/5.0 (Macintosh; …) … Chrome/130…" → "Chrome on macOS". */
function describeUserAgent(userAgent: string | null, t: UsersT) {
  if (!userAgent) {
    return t("sessions.unknownDevice");
  }
  const match = (list: [RegExp, string][]) =>
    list.find(([pattern]) => pattern.test(userAgent))?.[1];
  const browser = match(BROWSERS);
  const os = match(SYSTEMS);
  if (browser && os) {
    return t("sessions.browserOn", { browser, os });
  }
  return browser ?? os ?? userAgent;
}

/** "credential" → "Email and password", "google" → "Google". */
function providerLabel(provider: string, credentialLabel: string) {
  if (provider === "credential") {
    return credentialLabel;
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
