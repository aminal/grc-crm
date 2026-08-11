import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
