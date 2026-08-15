import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { requireUser } from '@/lib/auth/session';
import { getUserProfile } from '@/lib/data/profiles';
import { updateProfileAction } from './actions';

export default async function ProfilePage({ searchParams }: {
    searchParams: Promise<{ saved?: string }>
}): Promise<React.ReactElement> {
    const [params, user] = await Promise.all([searchParams, requireUser()]);
    const profile = await getUserProfile(user.uid);

    return (
        <div>
            <PageHeader title='Profile' description='Manage app-only staff settings used across CRM interactions.' />

            <Card className='max-w-2xl'>
                <CardHeader>
                    <CardTitle>Your Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    {params.saved === '1' ?
                        <div
                            className='profile-saved-notification mb-4 max-h-20 overflow-hidden rounded-lg border-2 border-emerald-400/85 bg-emerald-300/75 p-2 text-sm uppercase font-semibold dark:text-white'
                        >
                            Profile saved!
                        </div> : null}
                    <form action={updateProfileAction} className='space-y-4'>
                        <Field label='Email'>
                            <Input value={user.email} readOnly />
                        </Field>
                        <Field label='Display name'>
                            <Input name='display_name' defaultValue={profile?.data.display_name ?? user.name ?? ''} required />
                        </Field>
                        <div className='flex justify-end'>
                            <Button>Save Profile</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
