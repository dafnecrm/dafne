import {
  ContactIcon,
  HouseIcon,
  UserIcon,
  UsersIcon, type LucideIcon,
  ListClockIcon
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  /** Shown when the sidebar is minimized to a rail. */
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  /** Where the section title links to (usually its first page). */
  href: string;
  items: NavItem[];
  /** Only shown to users with the `admin` role. */
  adminOnly?: boolean;
}

/** Sidebar navigation: sections with their pages. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Home",
    href: "/",
    items: [{ title: "Dashboard", href: "/", icon: HouseIcon }],
  },
  {
    title: "CRM",
    href: "/customers",
    items: [
      { title: "Customers", href: "/customers", icon: ContactIcon },
      { title: "Activities", href: "/activities", icon: ListClockIcon },
    ],
  },
  {
    title: "Admin",
    href: "/users",
    adminOnly: true,
    items: [{ title: "Users", href: "/users", icon: UsersIcon }],
  },
  {
    title: "Account",
    href: "/account",
    items: [{ title: "Account", href: "/account", icon: UserIcon }],
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
