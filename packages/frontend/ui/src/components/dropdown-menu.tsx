"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "cn"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

import { Drawer, DrawerContent } from "@dafne/frontend-ui/components/drawer"
import { useIsMobile } from "@dafne/frontend-ui/hooks/use-mobile"

// On mobile a menu opens as a drawer from the bottom (an action sheet):
// every part below renders its drawer form while this is set. `closeAll`
// closes the drawer and the ones below it (a submenu is a drawer on top).
type DrawerMenu = { closeAll: () => void }

const InDrawerContext = React.createContext<DrawerMenu | null>(null)

function useDrawerMenu() {
  return React.useContext(InDrawerContext)
}

function useInDrawer() {
  return useDrawerMenu() !== null
}

// A drawer row: taller than a menu item, to be tapped; the text stays the
// menu's size.
const drawerItemClassName =
  "relative flex min-h-10 w-full cursor-default items-center gap-2.5 rounded-lg px-3 text-left text-sm outline-hidden select-none hover:bg-accent focus-visible:bg-accent active:bg-accent data-inset:pl-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:active:bg-destructive/10 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive"

/**
 * A dropdown menu; below the mobile breakpoint, a drawer from the bottom
 * with the same items, each submenu a second drawer on top of it.
 * `drawer={false}` keeps the dropdown on mobile too.
 */
function DropdownMenu({
  drawer = true,
  ...props
}: MenuPrimitive.Root.Props & { drawer?: boolean }) {
  const isMobile = useIsMobile()
  const { open: controlled, defaultOpen, onOpenChange } = props
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false)
  const setOpen = React.useCallback(
    (next: boolean, details?: unknown) => {
      setUncontrolled(next)
      ;(onOpenChange as ((open: boolean, details: unknown) => void) | undefined)?.(
        next,
        details
      )
    },
    [onOpenChange]
  )
  const menu = React.useMemo(
    () => ({ closeAll: () => setOpen(false) }),
    [setOpen]
  )
  if (drawer && isMobile) {
    return (
      <InDrawerContext.Provider value={menu}>
        <Drawer open={controlled ?? uncontrolled} onOpenChange={setOpen}>
          {props.children}
        </Drawer>
      </InDrawerContext.Provider>
    )
  }
  return (
    <InDrawerContext.Provider value={null}>
      <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
    </InDrawerContext.Provider>
  )
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  if (useInDrawer()) {
    return <>{props.children}</>
  }
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  if (useInDrawer()) {
    return (
      <DrawerPrimitive.Trigger
        data-slot="dropdown-menu-trigger"
        {...(props as DrawerPrimitive.Trigger.Props)}
      />
    )
  }
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  if (useInDrawer()) {
    // `className` sizes the popover (w-36…): not the drawer's.
    return (
      <DrawerMenuContent slot="dropdown-menu-content">
        {props.children as React.ReactNode}
      </DrawerMenuContent>
    )
  }
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn("z-50 max-h-(--available-height) w-max max-w-(--available-width) min-w-[max(var(--anchor-width),--spacing(32))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95", className )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DrawerMenuContent({
  slot,
  children,
}: {
  slot: string
  children: React.ReactNode
}) {
  return (
    <DrawerContent data-slot={slot}>
      <div className="flex flex-col overflow-y-auto p-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))]">
        {children}
      </div>
    </DrawerContent>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  if (useInDrawer()) {
    return (
      <div
        role="group"
        data-slot="dropdown-menu-group"
        className={cn("flex flex-col", props.className as string)}
      >
        {props.children as React.ReactNode}
      </div>
    )
  }
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  if (useInDrawer()) {
    return (
      <div
        data-slot="dropdown-menu-label"
        data-inset={inset}
        className={cn(
          "px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground data-inset:pl-9.5",
          className as string
        )}
      >
        {props.children as React.ReactNode}
      </div>
    )
  }
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  const menu = useDrawerMenu()
  if (menu) {
    // Every item closes the drawers (a submenu's too), as the menu does by
    // default.
    const rest = { ...props }
    // Menu-only props: not for the drawer's button.
    delete rest.closeOnClick
    delete rest.label
    const { render } = rest
    delete rest.render
    return (
      <DrawerPrimitive.Close
        data-slot="dropdown-menu-item"
        data-inset={inset}
        data-variant={variant}
        render={render as DrawerPrimitive.Close.Props["render"]}
        nativeButton={render ? false : undefined}
        className={cn(drawerItemClassName, className as string)}
        {...(rest as DrawerPrimitive.Close.Props)}
        onClick={(event) => {
          ;(rest.onClick as React.MouseEventHandler<HTMLElement> | undefined)?.(
            event
          )
          menu.closeAll()
        }}
      />
    )
  }
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  const parent = useDrawerMenu()
  const [open, setOpen] = React.useState(false)
  const menu = React.useMemo(
    () =>
      parent && {
        closeAll: () => {
          setOpen(false)
          parent.closeAll()
        },
      },
    [parent]
  )
  if (menu) {
    // A second drawer, on top of the menu's.
    return (
      <InDrawerContext.Provider value={menu}>
        <Drawer open={open} onOpenChange={setOpen}>
          {props.children}
        </Drawer>
      </InDrawerContext.Provider>
    )
  }
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  if (useInDrawer()) {
    // Opens the submenu's drawer.
    return (
      <DrawerPrimitive.Trigger
        data-slot="dropdown-menu-sub-trigger"
        data-inset={inset}
        disabled={props.disabled}
        className={cn(drawerItemClassName, className as string)}
      >
        {children}
        <ChevronRightIcon className="ml-auto text-muted-foreground" />
      </DrawerPrimitive.Trigger>
    )
  }
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  if (useInDrawer()) {
    return (
      <DrawerMenuContent slot="dropdown-menu-sub-content">
        {props.children as React.ReactNode}
      </DrawerMenuContent>
    )
  }
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  const menu = useDrawerMenu()
  const [uncontrolled, setUncontrolled] = React.useState(
    props.defaultChecked ?? false
  )
  if (menu) {
    const on = checked ?? uncontrolled
    return (
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={on}
        data-slot="dropdown-menu-checkbox-item"
        data-inset={inset}
        disabled={props.disabled}
        className={cn(drawerItemClassName, "pr-10", className as string)}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          setUncontrolled(!on)
          props.onCheckedChange?.(
            !on,
            event as unknown as Parameters<
              NonNullable<MenuPrimitive.CheckboxItem.Props["onCheckedChange"]>
            >[1]
          )
          if (props.closeOnClick) {
            menu.closeAll()
          }
        }}
      >
        {children}
        {on && <CheckIcon className="absolute right-3" />}
      </button>
    )
  }
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

const DrawerRadioContext = React.createContext<{
  value: unknown
  select: (value: unknown, event: React.MouseEvent) => void
} | null>(null)

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  const inDrawer = useInDrawer()
  const [uncontrolled, setUncontrolled] = React.useState(props.defaultValue)
  if (inDrawer) {
    const value = props.value !== undefined ? props.value : uncontrolled
    return (
      <DrawerRadioContext.Provider
        value={{
          value,
          select: (next, event) => {
            setUncontrolled(next)
            props.onValueChange?.(
              next,
              event as unknown as Parameters<
                NonNullable<MenuPrimitive.RadioGroup.Props["onValueChange"]>
              >[1]
            )
          },
        }}
      >
        <div
          role="group"
          data-slot="dropdown-menu-radio-group"
          className="flex flex-col"
        >
          {props.children as React.ReactNode}
        </div>
      </DrawerRadioContext.Provider>
    )
  }
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  const radio = React.useContext(DrawerRadioContext)
  const menu = useDrawerMenu()
  if (menu && radio) {
    const on = Object.is(radio.value, props.value)
    return (
      <button
        type="button"
        role="menuitemradio"
        aria-checked={on}
        data-slot="dropdown-menu-radio-item"
        data-inset={inset}
        disabled={props.disabled}
        className={cn(drawerItemClassName, "pr-10", className as string)}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          radio.select(props.value, event)
          if (props.closeOnClick) {
            menu.closeAll()
          }
        }}
      >
        {children}
        {on && <CheckIcon className="absolute right-3" />}
      </button>
    )
  }
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  if (useInDrawer()) {
    return (
      <div
        role="separator"
        data-slot="dropdown-menu-separator"
        className={cn("-mx-2 my-1 h-px bg-border", className as string)}
      />
    )
  }
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
