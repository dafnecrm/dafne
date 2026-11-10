"use client"

import * as React from "react"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dafne/frontend-ui/components/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@dafne/frontend-ui/components/sidebar"
import {
  containsUrl,
  findActiveUrl,
  isNavGroup,
  type NavGroup,
  type NavItem,
  type NavLeaf,
  type NavNode,
} from "@dafne/frontend-ui/lib/nav-items"

/** Active page uses the primary color (also on hover), icon included. */
const ACTIVE_CLASSES =
  "data-active:bg-sidebar-primary data-active:font-medium data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary/90 data-active:hover:text-sidebar-primary-foreground data-active:[&>svg]:text-sidebar-primary-foreground"

/** Animated height of a group's panel. */
const PANEL_CLASSES =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"

interface NavContextValue {
  /** Renders the links (e.g. Next's `Link`): gets `href` and `onClick`. */
  Link: React.ElementType
  closeOnMobile: () => void
}

const NavContext = React.createContext<NavContextValue>({
  Link: "a",
  closeOnMobile: () => {},
})

/** The sidebar is minimized to its icon rail (never on mobile). */
function useIsRail() {
  const { isMobile, state } = useSidebar()
  return state === "collapsed" && !isMobile
}

/**
 * Sidebar with a tree of links, up to 3 levels: every group collapses.
 * With `rail`, it minimizes to icons; groups stay there as icons that
 * collapse too (an item without icon shows its first letter).
 * `children` go in the menu after `items` (e.g. more `NavSidebarItems`).
 * Within `SidebarProvider`.
 */
function NavSidebar({
  items,
  pathname,
  header,
  footer,
  children,
  rail = false,
  variant = "floating",
  linkComponent = "a",
  ...props
}: Omit<React.ComponentProps<typeof Sidebar>, "collapsible" | "children"> & {
  items?: NavItem[]
  /** The current path, for the active item of `items`. */
  pathname?: string | null
  header?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
  rail?: boolean
  linkComponent?: React.ElementType
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const context = React.useMemo<NavContextValue>(
    () => ({
      Link: linkComponent,
      // On mobile the sidebar floats over the page: close it after a click.
      closeOnMobile: () => {
        if (isMobile) {
          setOpenMobile(false)
        }
      },
    }),
    [linkComponent, isMobile, setOpenMobile]
  )

  return (
    <NavContext.Provider value={context}>
      <Sidebar
        variant={variant}
        collapsible={rail ? "icon" : "offcanvas"}
        {...props}
      >
        {header ? <SidebarHeader>{header}</SidebarHeader> : null}
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu className="gap-2">
              {items ? (
                <NavSidebarItems items={items} pathname={pathname} />
              ) : null}
              {children}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        {footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
        {rail ? <SidebarRail /> : null}
      </Sidebar>
    </NavContext.Provider>
  )
}

/** Top-level items, inside `NavSidebar`'s menu. */
function NavSidebarItems({
  items,
  pathname,
}: {
  items: NavItem[]
  pathname?: string | null
}) {
  const activeUrl = findActiveUrl(items, pathname)
  return items.map((item, index) => (
    <NavSidebarNode
      key={item.url ?? `${index}:${item.label}`}
      item={item}
      depth={1}
      activeUrl={activeUrl}
    />
  ))
}

interface NodeProps<T extends NavNode = NavNode> {
  item: T
  /** 1 for top-level items. */
  depth: number
  activeUrl: string | undefined
}

function NavSidebarNode({ item, ...props }: NodeProps) {
  return isNavGroup(item) ? (
    <NavSidebarGroup item={item} {...props} />
  ) : (
    <NavSidebarLeaf item={item} {...props} />
  )
}

function NavSidebarChildren({ item, depth, activeUrl }: NodeProps<NavGroup<NavNode>>) {
  return item.children.map((child, index) => (
    <NavSidebarNode
      key={child.url ?? `${index}:${child.label}`}
      item={child}
      depth={depth + 1}
      activeUrl={activeUrl}
    />
  ))
}

/** The item's icon; in the rail, its first letter when it has none. */
function NavSidebarIcon({ item, rail }: { item: NavNode; rail: boolean }) {
  if (item.icon) {
    return <item.icon />
  }
  if (!rail) {
    return null
  }
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 items-center justify-center text-xs font-semibold"
    >
      {item.label.charAt(0).toUpperCase()}
    </span>
  )
}

function NavSidebarLeaf({ item, depth, activeUrl }: NodeProps<NavLeaf>) {
  const { Link, closeOnMobile } = React.useContext(NavContext)
  const isRail = useIsRail()
  const link = <Link href={item.url} onClick={closeOnMobile} />
  const isActive = item.url === activeUrl

  if (isRail || depth === 1) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.label}
          className={ACTIVE_CLASSES}
          render={link}
        >
          <NavSidebarIcon item={item} rail={isRail} />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={isActive}
        className={ACTIVE_CLASSES}
        render={link}
      >
        <NavSidebarIcon item={item} rail={false} />
        <span>{item.label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function NavSidebarGroup({
  item,
  depth,
  activeUrl,
}: NodeProps<NavGroup<NavNode>>) {
  const { Link, closeOnMobile } = React.useContext(NavContext)
  const isRail = useIsRail()
  const holdsActive = containsUrl(item, activeUrl)
  // One state for both modes, so it survives switching to the rail and back.
  const [open, setOpen] = React.useState(
    (item.defaultOpen ?? true) || holdsActive
  )
  // Opens when navigation lands on one of its pages.
  const [heldActive, setHeldActive] = React.useState(holdsActive)
  if (holdsActive !== heldActive) {
    setHeldActive(holdsActive)
    if (holdsActive) {
      setOpen(true)
    }
  }

  const label = (
    <>
      <NavSidebarIcon item={item} rail={isRail} />
      <span className="truncate">{item.label}</span>
    </>
  )
  const children = (
    <NavSidebarChildren item={item} depth={depth} activeUrl={activeUrl} />
  )

  // Rail: the group is an icon too, its pages stack under it. Groups inside
  // it don't show: their pages are listed directly, so boxes never nest.
  if (isRail) {
    const pages = item.children.flatMap((child) =>
      isNavGroup(child) ? child.children : [child]
    )
    return (
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        // Open, the group and its pages share a bordered box, 6px wider than
        // the icons on each side (the rail has 8px) so the border doesn't cut
        // the buttons' corners. The border is an overlay: it doesn't move them.
        render={
          <SidebarMenuItem className="rounded-lg data-open:-mx-1.5 data-open:bg-sidebar-accent/40 data-open:px-1.5 data-open:pb-1.5 data-open:after:pointer-events-none data-open:after:absolute data-open:after:inset-0 data-open:after:rounded-lg data-open:after:border data-open:after:border-sidebar-border" />
        }
      >
        <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.label} />}>
          {label}
        </CollapsibleTrigger>
        <CollapsibleContent className={PANEL_CLASSES}>
          <SidebarMenu className="mt-1">
            {pages.map((page, index) => (
              <NavSidebarNode
                key={page.url ?? `${index}:${page.label}`}
                item={page}
                depth={depth + 1}
                activeUrl={activeUrl}
              />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const isTop = depth === 1
  const Item = isTop ? SidebarMenuItem : SidebarMenuSubItem
  const chevron =
    "transition-transform duration-200 group-data-panel-open/nav-trigger:rotate-90"

  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<Item />}>
      {item.url ? (
        // A link label, and the chevron alone toggles.
        <>
          {isTop ? (
            <SidebarMenuButton
              isActive={item.url === activeUrl}
              className={cn("font-medium", ACTIVE_CLASSES)}
              render={<Link href={item.url} onClick={closeOnMobile} />}
            >
              {label}
            </SidebarMenuButton>
          ) : (
            <SidebarMenuSubButton
              isActive={item.url === activeUrl}
              className={cn("pr-7", ACTIVE_CLASSES)}
              render={<Link href={item.url} onClick={closeOnMobile} />}
            >
              {label}
            </SidebarMenuSubButton>
          )}
          <CollapsibleTrigger
            aria-label={item.label}
            render={
              <SidebarMenuAction
                className={cn("group/nav-trigger", !isTop && "top-1")}
              />
            }
          >
            <ChevronRightIcon className={chevron} />
          </CollapsibleTrigger>
        </>
      ) : isTop ? (
        <CollapsibleTrigger
          render={
            <SidebarMenuButton className="group/nav-trigger font-medium" />
          }
        >
          {label}
          <ChevronRightIcon className={cn("ml-auto", chevron)} />
        </CollapsibleTrigger>
      ) : (
        <CollapsibleTrigger
          render={
            <SidebarMenuSubButton
              className="group/nav-trigger w-full"
              render={<button type="button" />}
            />
          }
        >
          {label}
          <ChevronRightIcon className={cn("ml-auto", chevron)} />
        </CollapsibleTrigger>
      )}
      {item.children.length ? (
        <CollapsibleContent className={PANEL_CLASSES}>
          {/* Indented with the line on the left, full width on the right. */}
          <SidebarMenuSub className="mr-0 pr-0">{children}</SidebarMenuSub>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  )
}

export { NavSidebar, NavSidebarItems }
export type { NavGroup, NavItem, NavLeaf } from "@dafne/frontend-ui/lib/nav-items"
