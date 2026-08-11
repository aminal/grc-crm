import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/data/profiles";
import { updateProfileAction } from "./actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }): Promise<React.ReactElement> {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const profile = await getUserProfile(user.uid);

  return (
    <div>
      <PageHeader title="Profile" description="Manage app-only staff settings used across CRM interactions and Google Voice call links." />

      <Card className="max-w-2xl">
        <CardHeader>
          <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Your Settings</h2>
        </CardHeader>
        <CardContent>
          {params.saved === "1" ? <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/15 p-3 text-sm text-green-700">Profile saved.</div> : null}
          <form action={updateProfileAction} className="space-y-4">
            <Field label="Email">
              <Input value={user.email} readOnly />
            </Field>
            <Field label="Display name">
              <Input name="display_name" defaultValue={profile?.data.display_name ?? user.name ?? ""} required />
            </Field>
            <Field label="Google Voice number">
              <Input name="google_voice_number" defaultValue={profile?.data.google_voice_number ?? user.google_voice_number ?? ""} placeholder="+15555555555" />
            </Field>
            <Button>Save Profile</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
