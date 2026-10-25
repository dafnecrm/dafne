import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted px-4 py-16">
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
