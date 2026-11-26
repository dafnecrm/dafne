"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

import { Drawer, DrawerContent } from "@dafne/frontend-ui/components/drawer"
import { useIsMobile } from "@dafne/frontend-ui/hooks/use-mobile"

// On mobile the options open in a drawer from the bottom: the trigger and
// the value stay Base UI's (the root's `items` name the value), the
// content and items render their drawer form while this is set.
type SelectDrawer = {
  isSelected: (value: unknown) => boolean
  select: (value: unknown, event: React.MouseEvent) => void
}

const SelectDrawerContext = React.createContext<SelectDrawer | null>(null)

// A drawer row: taller than an item, to be tapped (as the menu's).
const drawerItemClassName =
  "relative flex min-h-10 w-full cursor-default items-center gap-2.5 rounded-lg pr-10 pl-3 text-left text-sm outline-hidden select-none hover:bg-accent focus-visible:bg-accent active:bg-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

/**
 * A select; below the mobile breakpoint (single value), its options open
 * in a drawer from the bottom. Pass `items` so the trigger names the value
 * without the options mounted. `drawer={false}` keeps the popup.
 */
function Select<Value, Multiple extends boolean | undefined = false>({
  drawer = true,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple> & { drawer?: boolean }) {
  const isMobile = useIsMobile()
  const [open, setOpenState] = React.useState(false)
  const [uncontrolled, setUncontrolled] = React.useState(props.defaultValue)
  const { onOpenChange, onValueChange, isItemEqualToValue } = props
  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next)
      ;(onOpenChange as ((open: boolean) => void) | undefined)?.(next)
    },
    [onOpenChange]
  )
  const value = props.value !== undefined ? props.value : uncontrolled
  const sheet = React.useMemo<SelectDrawer>(
    () => ({
      isSelected: (item) =>
        value !== null &&
        value !== undefined &&
        (isItemEqualToValue
          ? (isItemEqualToValue as (a: unknown, b: unknown) => boolean)(
              item,
              value
            )
          : Object.is(item, value)),
      select: (item, event) => {
        setUncontrolled(item as typeof uncontrolled)
        ;(
          onValueChange as
            | ((value: unknown, details: unknown) => void)
            | undefined
        )?.(item, { reason: "item-press", event })
        setOpen(false)
      },
    }),
    [value, isItemEqualToValue, onValueChange, setOpen]
  )
  if (drawer && isMobile && !props.multiple) {
    return (
      <SelectDrawerContext.Provider value={sheet}>
        <Drawer open={open} onOpenChange={setOpen}>
          <SelectPrimitive.Root
            {...props}
            value={value as typeof props.value}
            // Its popup stays closed: the trigger opens the drawer.
            open={false}
            onOpenChange={(next) => {
              if (next) {
                setOpen(true)
              }
            }}
          />
        </Drawer>
      </SelectDrawerContext.Provider>
    )
  }
  return (
    <SelectDrawerContext.Provider value={null}>
      <SelectPrimitive.Root {...props} />
    </SelectDrawerContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  if (React.useContext(SelectDrawerContext)) {
    return (
      <div
        role="group"
        data-slot="select-group"
        className={cn("flex flex-col", className as string)}
      >
        {props.children as React.ReactNode}
      </div>
    )
  }
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  anchor,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    | "align"
    | "alignOffset"
    | "side"
    | "sideOffset"
    | "alignItemWithTrigger"
    | "anchor"
  >) {
  if (React.useContext(SelectDrawerContext)) {
    // `className` sizes the popup: not the drawer's.
    return (
      <DrawerContent data-slot="select-content">
        <div
          role="listbox"
          className="flex flex-col overflow-y-auto p-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))]"
        >
          {children as React.ReactNode}
        </div>
      </DrawerContent>
    )
  }
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        anchor={anchor}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn("relative isolate z-50 max-h-(--available-height) w-max max-w-(--available-width) min-w-[max(var(--anchor-width),--spacing(36))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  if (React.useContext(SelectDrawerContext)) {
    return (
      <div
        data-slot="select-label"
        className={cn(
          "px-3 pt-2 pb-1 text-xs text-muted-foreground",
          className as string
        )}
      >
        {props.children as React.ReactNode}
      </div>
    )
  }
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  const sheet = React.useContext(SelectDrawerContext)
  if (sheet) {
    const selected = sheet.isSelected(props.value)
    return (
      <button
        type="button"
        role="option"
        aria-selected={selected}
        data-slot="select-item"
        disabled={props.disabled}
        className={cn(drawerItemClassName, className as string)}
        onClick={(event) => sheet.select(props.value, event)}
      >
        <span className="flex flex-1 shrink-0 items-center gap-2 whitespace-nowrap">
          {children}
        </span>
        {selected && <CheckIcon className="absolute right-3" />}
      </button>
    )
  }
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  if (React.useContext(SelectDrawerContext)) {
    return (
      <div
        role="separator"
        data-slot="select-separator"
        className={cn("-mx-2 my-1 h-px bg-border", className as string)}
      />
    )
  }
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
