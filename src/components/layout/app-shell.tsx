import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthenticatedUser } from "@/lib/domain/types";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
      <Sidebar user={user} logoutAction={logoutAction} />
      <main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64 lg:ml-[1px]">
        <div className="grow pt-4 px-6 pb-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function redirectHome(): never {
  redirect("/dashboard");
}
