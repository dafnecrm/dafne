import { Suspense, type CSSProperties, type ReactNode } from "react";
import { AppSidebar, PageBreadcrumb } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireUser } from "@/lib/session";

/** Layout for pages that need a signed-in user. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem" } as CSSProperties}>
      <AppSidebar
        footer={
          // The session is read per request, so the user streams in behind a boundary.
          <Suspense fallback={<UserSkeleton />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <PageBreadcrumb />
          <ThemeToggle className="ml-auto" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
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

async function SidebarUser() {
  const { name, firstname, lastname, email, image } = await requireUser();
  return <NavUser user={{ name, firstname, lastname, email, image }} />;
}
