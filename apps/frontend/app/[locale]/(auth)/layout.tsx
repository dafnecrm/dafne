import type { ReactNode } from "react";
import { ThemeToggle } from "@dafne/frontend-ui/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center bg-muted px-4 py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
