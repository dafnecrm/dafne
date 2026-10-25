"use client";

import {
  ChevronRightIcon,
  ContactIcon,
  LayoutGridCirclesIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { findNavItem, NAV_SECTIONS } from "@/lib/navigation";

/** Active page uses the primary color (also on hover), icon included. */
const ACTIVE_CLASSES =
  "data-active:bg-sidebar-primary data-active:font-medium data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary/90 data-active:hover:text-sidebar-primary-foreground data-active:[&>svg]:text-sidebar-primary-foreground";

/**
 * Floating sidebar with sections and their pages (shadcn sidebar-04).
 * Minimizes to an icon rail; `footer` is the signed-in user, rendered on the server.
 */
export function AppSidebar({ footer }: { footer: ReactNode }) {
  const active = findNavItem(usePathname());
  const { isMobile, setOpenMobile, state } = useSidebar();
  // On mobile the sidebar floats over the page: close it after picking a page.
  const closeOnMobile = () => isMobile && setOpenMobile(false);
  // Sub-menus can't show in the rail, so it lists every page as an icon.
  const isRail = state === "collapsed" && !isMobile;

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
                <LayoutGridCirclesIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Tiny CRM</span>
                <span className="text-xs text-muted-foreground">
                  A tiny CRM
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {isRail ? (
            <SidebarMenu>
              {NAV_SECTIONS.flatMap((section) => section.items).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={item === active?.item}
                    tooltip={item.title}
                    className={ACTIVE_CLASSES}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          ) : (
            <SidebarMenu className="gap-2">
              {NAV_SECTIONS.map((section) => (
                <Collapsible
                  key={section.title}
                  defaultOpen
                  render={<SidebarMenuItem />}
                >
                  <CollapsibleTrigger
                    render={<SidebarMenuButton className="font-medium" />}
                  >
                    {section.title}
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
                              render={
                                <Link
                                  href={item.href}
                                  onClick={closeOnMobile}
                                />
                              }
                            >
                              <item.icon />
                              <span>{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  ) : null}
                </Collapsible>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** Breadcrumb for the current page: section › page. */
export function PageBreadcrumb() {
  const active = findNavItem(usePathname());
  if (!active) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink render={<Link href={active.section.href} />}>
            {active.section.title}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{active.item.title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
