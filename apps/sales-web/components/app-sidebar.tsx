"use client";

import { PawPrint } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  NavSidebar,
  NavSidebarItems,
  type NavItem,
} from "@dafne/frontend-ui/components/nav-sidebar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@dafne/frontend-ui/components/sidebar";
import { isNavGroup, NAV_SECTIONS } from "@/lib/navigation";
import { useIsMobile } from "@dafne/frontend-ui/hooks/use-mobile";

/**
 * Floating sidebar with sections and their pages, minimizing to an icon
 * rail. Rendered on the server: `footer` is the signed-in user, `adminNav`
 * the admin-only sections (empty for others).
 */
export function AppSidebar({
  footer,
  adminNav,
}: {
  footer: ReactNode;
  adminNav?: ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <NavSidebar rail linkComponent={Link} header={<Brand />} footer={footer}>
      <NavSections />
      {/** admin nav is visible only on desktop */}
      {!isMobile && adminNav}
    </NavSidebar>
  );
}

function Brand() {
  const { isMobile, setOpenMobile } = useSidebar();
  const t = useTranslations("nav");
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          render={
            <Link href="/" onClick={() => isMobile && setOpenMobile(false)} />
          }
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <PawPrint className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-medium">Dafne Sales</span>
            <span className="text-xs text-muted-foreground">
              {t("tagline")}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * The visible sections (`admin`: the admin-only ones), as collapsible
 * groups of pages. A server component can render it: icons can't be
 * passed as props.
 *
 * The URL (for the active page) isn't known when prerendering dynamic
 * routes such as /users/[id], so it's read behind a Suspense boundary; until
 * then the sections show with no active page.
 */
export function NavSections({
  admin = false,
  superAdmin = false,
}: {
  admin?: boolean;
  /** Also the super-admins' sections, groups and pages. */
  superAdmin?: boolean;
}) {
  return (
    <Suspense fallback={<Sections admin={admin} superAdmin={superAdmin} pathname={null} />}>
      <ActiveSections admin={admin} superAdmin={superAdmin} />
    </Suspense>
  );
}

function ActiveSections({ admin, superAdmin }: { admin: boolean; superAdmin: boolean }) {
  return <Sections admin={admin} superAdmin={superAdmin} pathname={usePathname()} />;
}

function Sections({
  admin,
  superAdmin,
  pathname,
}: {
  admin: boolean;
  superAdmin: boolean;
  pathname: string | null;
}) {
  const t = useTranslations("nav");
  const visible = (entry: { superAdminOnly?: boolean }) => !entry.superAdminOnly || superAdmin;
  const items: NavItem[] = NAV_SECTIONS.filter(
    (section) => !section.hidden && !!section.adminOnly === admin && visible(section),
  ).map((section) => ({
    label: t(section.title),
    icon: section.icon,
    children: section.items.filter(visible).map((entry) =>
      isNavGroup(entry)
        ? {
            label: t(entry.title),
            icon: entry.icon,
            children: entry.items.filter(visible).map((item) => ({
              label: t(item.title),
              url: item.href,
              icon: item.icon,
            })),
          }
        : { label: t(entry.title), url: entry.href, icon: entry.icon },
    ),
  }));
  return <NavSidebarItems items={items} pathname={pathname} />;
}
