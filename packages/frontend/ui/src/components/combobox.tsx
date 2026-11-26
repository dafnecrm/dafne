"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { cn } from "cn"

import { Button } from "@dafne/frontend-ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@dafne/frontend-ui/components/input-group"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@dafne/frontend-ui/components/drawer"
import { useIsMobile } from "@dafne/frontend-ui/hooks/use-mobile"
import { ChevronDownIcon, XIcon, CheckIcon, SearchIcon } from "lucide-react"

// The field the popup lines up with: the whole input group (addons
// included), not just the <input> Base UI anchors to by default.
const ComboboxFieldContext = React.createContext<{
  field: HTMLDivElement | null
  setField: (field: HTMLDivElement | null) => void
} | null>(null)

// On mobile the list opens in a drawer from the bottom: the field becomes
// a button showing the value, and the search box moves into the drawer
// (the keyboard would cover a popup under the field). The drawer's open
// state is the combobox's.
type ComboboxDrawer = {
  setOpen: (open: boolean) => void
  // The field's placeholder and label, for the drawer's search box.
  label: string | undefined
  setLabel: (label: string | undefined) => void
}

const ComboboxDrawerContext = React.createContext<ComboboxDrawer | null>(null)

/**
 * A combobox; below the mobile breakpoint (single value, `ComboboxInput`),
 * its list opens in a drawer from the bottom with a search box on top.
 * `drawer={false}` keeps the popup on mobile too (e.g. a custom input).
 */
function Combobox<
  Value,
  Multiple extends boolean | undefined = false,
  Item = Value,
>({
  drawer = true,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple, Item> & {
  drawer?: boolean
}) {
  const isMobile = useIsMobile()
  const [field, setField] = React.useState<HTMLDivElement | null>(null)
  const context = React.useMemo(() => ({ field, setField }), [field])
  const [open, setOpenState] = React.useState(false)
  const [label, setLabel] = React.useState<string>()
  const { onOpenChange, onValueChange } = props
  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next)
      ;(onOpenChange as ((open: boolean) => void) | undefined)?.(next)
    },
    [onOpenChange]
  )
  const sheet = React.useMemo(
    () => ({ setOpen, label, setLabel }),
    [setOpen, label]
  )
  if (drawer && isMobile && !props.multiple) {
    return (
      <ComboboxFieldContext.Provider value={context}>
        <ComboboxDrawerContext.Provider value={sheet}>
          {/* A key per mode: crossing the breakpoint (or hydrating on
              mobile, `useIsMobile` is false on the server) remounts the
              Root instead of switching its `open` to controlled. */}
          <ComboboxPrimitive.Root
            key="drawer"
            {...props}
            // The list is in the drawer, not in Base UI's popup: the
            // drawer opens and closes it (a pick closes it too).
            inline
            open={open}
            onOpenChange={() => {}}
            onValueChange={(value, details) => {
              ;(
                onValueChange as
                  | ((value: unknown, details: unknown) => void)
                  | undefined
              )?.(value, details)
              setOpen(false)
            }}
          >
            <Drawer open={open} onOpenChange={setOpen}>
              {props.children}
            </Drawer>
          </ComboboxPrimitive.Root>
        </ComboboxDrawerContext.Provider>
      </ComboboxFieldContext.Provider>
    )
  }
  return (
    <ComboboxFieldContext.Provider value={context}>
      <ComboboxDrawerContext.Provider value={null}>
        <ComboboxPrimitive.Root key="popup" {...props} />
      </ComboboxDrawerContext.Provider>
    </ComboboxFieldContext.Provider>
  )
}

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  const setField = React.useContext(ComboboxFieldContext)?.setField
  const sheet = React.useContext(ComboboxDrawerContext)
  const label =
    (props["aria-label"] as string | undefined) ??
    (typeof props.placeholder === "string" ? props.placeholder : undefined)
  const setLabel = sheet?.setLabel
  React.useEffect(() => {
    setLabel?.(label)
  }, [setLabel, label])
  if (sheet) {
    // A button showing the value; the search box is in the drawer.
    return (
      <InputGroup ref={setField} className={cn("w-auto", className)}>
        <button
          type="button"
          id={props.id}
          data-slot="input-group-control"
          aria-label={props["aria-label"]}
          aria-invalid={props["aria-invalid"]}
          aria-haspopup="dialog"
          disabled={disabled}
          onBlur={props.onBlur as unknown as React.FocusEventHandler<HTMLButtonElement>}
          onClick={() => sheet.setOpen(true)}
          className="flex h-full min-w-0 flex-1 cursor-default items-center truncate px-2.5 text-left text-sm outline-none disabled:cursor-not-allowed group-has-[>[data-align=inline-start]]/input-group:pl-1.5"
        >
          <span className="truncate">
            <ComboboxPrimitive.Value
              placeholder={
                <span className="text-muted-foreground">
                  {props.placeholder}
                </span>
              }
            />
          </span>
        </button>
        <InputGroupAddon align="inline-end">
          {showTrigger && (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              tabIndex={-1}
              aria-hidden
              className="group-has-data-[slot=combobox-clear]/input-group:hidden"
              disabled={disabled}
              onClick={() => sheet.setOpen(true)}
            >
              <ChevronDownIcon className="pointer-events-none text-muted-foreground" />
            </InputGroupButton>
          )}
          {showClear && <ComboboxClear disabled={disabled} />}
        </InputGroupAddon>
        {children}
      </InputGroup>
    )
  }
  return (
    <InputGroup ref={setField} className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  // Set by ComboboxInput; a custom input keeps Base UI's default.
  const field = React.useContext(ComboboxFieldContext)?.field
  const sheet = React.useContext(ComboboxDrawerContext)
  const top = React.useRef<HTMLDivElement>(null)
  if (sheet) {
    // `className` sizes the popup: not the drawer's. The focus goes to the
    // drawer, not the search box: no keyboard until it's tapped.
    return (
      <DrawerContent
        data-slot="combobox-content"
        initialFocus={top}
        className="group/combobox-content"
      >
        <DrawerTitle className="sr-only">{sheet.label}</DrawerTitle>
        <div ref={top} tabIndex={-1} className="p-2 pb-0 outline-none">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <ComboboxPrimitive.Input
              aria-label={sheet.label}
              placeholder={sheet.label}
              render={<InputGroupInput />}
            />
          </InputGroup>
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-y-auto p-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))]",
            // The list's own height cap is a popup's.
            "**:data-[slot=combobox-list]:max-h-none **:data-[slot=combobox-list]:overflow-visible **:data-[slot=combobox-list]:p-0",
            "**:data-[slot=combobox-item]:min-h-10 **:data-[slot=combobox-item]:rounded-lg **:data-[slot=combobox-item]:pl-3 **:data-[slot=combobox-item]:pr-10",
            // Popup-only: it shows through the popup's data-empty.
            "**:data-[slot=combobox-empty]:not-empty:flex"
          )}
        >
          {props.children as React.ReactNode}
        </div>
      </DrawerContent>
    )
  }
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor ?? field ?? undefined}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn("group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className
      )}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
        className
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
