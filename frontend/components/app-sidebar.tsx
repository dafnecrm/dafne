"use client";

import {
  ChevronRightIcon,
  ContactIcon,
  LayoutGridCirclesIcon,
  PawPrint,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { findNavItem, NAV_SECTIONS, type NavTitle } from "@/lib/navigation";

/** Active page uses the primary color (also on hover), icon included. */
const ACTIVE_CLASSES =
  "data-active:bg-sidebar-primary data-active:font-medium data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary/90 data-active:hover:text-sidebar-primary-foreground data-active:[&>svg]:text-sidebar-primary-foreground";

/** Sub-menus can't show in the rail, so it lists every page as an icon. */
function useIsRail() {
  const { isMobile, state } = useSidebar();
  return state === "collapsed" && !isMobile;
}

/**
 * Floating sidebar with sections and their pages (shadcn sidebar-04).
 * Minimizes to an icon rail. Rendered on the server: `footer` is the
 * signed-in user, `adminNav` the admin-only sections (empty for others).
 */
export function AppSidebar({
  footer,
  adminNav,
}: {
  footer: ReactNode;
  adminNav?: ReactNode;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  // On mobile the sidebar floats over the page: close it after picking a page.
  const closeOnMobile = () => isMobile && setOpenMobile(false);
  const isRail = useIsRail();
  const t = useTranslations("nav");

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" onClick={closeOnMobile} />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <PawPrint className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Dafne</span>
                <span className="text-xs text-muted-foreground">
                  {t("tagline")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className={isRail ? undefined : "gap-2"}>
            {NAV_SECTIONS.filter((section) => !section.adminOnly && !section.hidden).map(
              (section) => (
                <NavSectionItems key={section.title} title={section.title} />
              ),
            )}
            {adminNav}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/**
 * One sidebar section, by title (a server component can render it: icons
 * can't be passed as props). A collapsible group of pages, or icons in the rail.
 *
 * The URL (for the active page) isn't known when prerendering dynamic
 * routes such as /users/[id], so it's read behind a Suspense boundary; until
 * then the section shows with no active page.
 */
export function NavSectionItems({ title }: { title: NavTitle }) {
  return (
    <Suspense fallback={<NavSection title={title} pathname={null} />}>
      <ActiveNavSection title={title} />
    </Suspense>
  );
}

function ActiveNavSection({ title }: { title: NavTitle }) {
  return <NavSection title={title} pathname={usePathname()} />;
}

function NavSection({
  title,
  pathname,
}: {
  title: NavTitle;
  pathname: string | null;
}) {
  const t = useTranslations("nav");
  const section = NAV_SECTIONS.find((s) => s.title === title);
  const active = pathname ? findNavItem(pathname) : undefined;
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => isMobile && setOpenMobile(false);
  const isRail = useIsRail();
  if (!section) return null;

  if (isRail) {
    return section.items.map((item) => (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          isActive={item === active?.item}
          tooltip={t(item.title)}
          className={ACTIVE_CLASSES}
          render={<Link href={item.href} />}
        >
          <item.icon />
          <span>{t(item.title)}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  }

  return (
    <Collapsible defaultOpen render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        render={<SidebarMenuButton className="font-medium" />}
      >
        {t(section.title)}
        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-panel-open/menu-button:rotate-90" />
      </CollapsibleTrigger>
      {section.items.length ? (
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
          <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
            {section.items.map((item) => (
              <SidebarMenuSubItem key={item.href}>
                <SidebarMenuSubButton
                  isActive={item === active?.item}
                  className={ACTIVE_CLASSES}
                  render={<Link href={item.href} onClick={closeOnMobile} />}
                >
                  <item.icon />
                  <span>{t(item.title)}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}
