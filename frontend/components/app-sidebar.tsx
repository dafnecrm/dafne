"use client";

import { ChevronRightIcon, ContactIcon } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { findNavItem, NAV_SECTIONS } from "@/lib/navigation";

/**
 * Floating sidebar with sections and their pages (shadcn sidebar-04).
 * `footer` is the signed-in user, rendered on the server.
 */
export function AppSidebar({ footer }: { footer: ReactNode }) {
  const active = findNavItem(usePathname());
  const { isMobile, setOpenMobile } = useSidebar();
  // On mobile the sidebar floats over the page: close it after picking a page.
  const closeOnMobile = () => isMobile && setOpenMobile(false);

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" onClick={closeOnMobile} />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ContactIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Tiny CRM</span>
                <span className="text-xs text-muted-foreground">
                  Customer relationships
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
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
                            // Active page uses the primary color (also on hover).
                            className="data-active:bg-sidebar-primary data-active:font-medium data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary/90 data-active:hover:text-sidebar-primary-foreground"
                            render={
                              <Link href={item.href} onClick={closeOnMobile} />
                            }
                          >
                            {item.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
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
