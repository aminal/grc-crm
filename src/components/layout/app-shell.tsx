import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthenticatedUser } from "@/lib/domain/types";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950 print:bg-white print:dark:bg-white">
      <div className="print:hidden">
        <Sidebar user={user} logoutAction={logoutAction} />
      </div>
      <main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64 lg:ml-[1px] print:p-0 print:m-0 print:lg:ml-0">
        <div className="grow pt-4 px-6 pb-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10 print:p-0 print:shadow-none print:ring-0 print:bg-white print:dark:bg-white">
          <div className="mx-auto max-w-6xl print:max-w-none">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function redirectHome(): never {
  redirect("/dashboard");
}
