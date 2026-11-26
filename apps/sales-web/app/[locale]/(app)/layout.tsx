import { Suspense, type CSSProperties, type ReactNode } from "react";
import { AppSidebar, NavSections } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import {
  BreadcrumbProvider,
  PageBreadcrumb,
} from "@/components/page-breadcrumb";
import { LeaveGuardProvider } from "@dafne/frontend-forms/leave-guard";
import { ThemeToggle } from "@dafne/frontend-ui/components/theme-toggle";
import { AssistantButton } from "@/components/assistant-button";
import { PermissionsProvider } from "@dafne/frontend-permissions";
import { loadMyPermissions } from "@dafne/frontend-permissions/server";
import { Separator } from "@dafne/frontend-ui/components/separator";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@dafne/frontend-ui/components/sidebar";
import { getCurrentUser, isAdmin, isSuperAdmin, requireUser } from "@/lib/session";
import { TelemetryUser } from "@dafne/frontend-logger/telemetry";

/** Layout for pages that need a signed-in user. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem" } as CSSProperties}>
      <AppSidebar
        adminNav={
          <Suspense fallback={null}>
            <AdminNav />
          </Suspense>
        }
        footer={
          // The session is read per request, so the user streams in behind a boundary.
          <Suspense fallback={<UserSkeleton />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset>
        {/* Pages name their level of the breadcrumb (<BreadcrumbLabel>). */}
        <BreadcrumbProvider>
          {/* Stays on top while the page scrolls under it. */}
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 rounded-t-[inherit] bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <PageBreadcrumb />
            <div className="ml-auto flex items-center gap-1">
              <AssistantButton />
              <ThemeToggle />
            </div>
          </header>
          {/* What the user can do (<Can>): the promise, not awaited. */}
          <PermissionsProvider permissions={loadMyPermissions()}>
            {/* Asks before leaving a form with unsaved changes (useResetOnLeave). */}
            <LeaveGuardProvider>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
            </LeaveGuardProvider>
          </PermissionsProvider>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Not SidebarMenuSkeleton: its random width breaks prerendering.
function UserSkeleton() {
  return (
    <div className="flex h-12 items-center gap-2 p-2 group-data-[collapsible=icon]:p-0">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

/** Admin-only sidebar sections; nothing for other users. */
async function AdminNav() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return null;
  }
  return <NavSections admin superAdmin={isSuperAdmin(user)} />;
}

async function SidebarUser() {
  const { id, name, firstname, lastname, email, image } = await requireUser();
  return (
    <>
      {/* The browser's telemetry carries the user's id only. */}
      <TelemetryUser id={id} />
      <NavUser user={{ name, firstname, lastname, email, image }} />
    </>
  );
}
