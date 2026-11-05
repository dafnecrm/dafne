import type { Messages } from "next-intl";
import {
  ContactIcon,
  HouseIcon,
  UserIcon,
  UsersIcon, type LucideIcon,
  ListClockIcon,
  GroceriesIcon
} from "lucide-react";

/** A title: a key of the `nav` messages, translated where it's shown. */
export type NavTitle = keyof Messages["nav"];

export interface NavItem {
  title: NavTitle;
  href: string;
  /** Shown when the sidebar is minimized to a rail. */
  icon: LucideIcon;
}

export interface NavSection {
  title: NavTitle;
  /** Where the section title links to (usually its first page). */
  href: string;
  items: NavItem[];
  /** Only shown to users with the `admin` role. */
  adminOnly?: boolean;
  /** Only used to show breadcrumb. */
  hidden?: boolean;
}

/** Sidebar navigation: sections with their pages. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "home",
    href: "/",
    items: [{ title: "dashboard", href: "/", icon: HouseIcon }],
  },
  {
    title: "sales",
    href: "/customers",
    items: [
      { title: "customers", href: "/customers", icon: ContactIcon },
      { title: "activities", href: "/activities", icon: ListClockIcon },
      { title: "products", href: "/products", icon: GroceriesIcon },
    ],
  },
  {
    title: "admin",
    href: "/users",
    adminOnly: true,
    items: [{ title: "users", href: "/users", icon: UsersIcon }],
  },
  {
    title: "account",
    href: "/account",
    items: [{ title: "account", href: "/account", icon: UserIcon }],
    hidden: true,
  },
];

/** The section and page for a path ("/account/x" matches "/account"). */
export function findNavItem(pathname: string) {
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (item) return { section, item };
  }
  return undefined;
}
