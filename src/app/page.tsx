import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home(): Promise<never> {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
