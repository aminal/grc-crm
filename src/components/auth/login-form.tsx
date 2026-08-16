'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { connectFirebaseAuthEmulator, getFirebaseAuth, googleProvider } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';

export function LoginForm(): React.ReactElement {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function signIn(): Promise<void> {
        setError(null);
        setLoading(true);
        connectFirebaseAuthEmulator();

        try {
            const credential = await signInWithPopup(getFirebaseAuth(), googleProvider);
            const idToken = await credential.user.getIdToken();
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id_token: idToken }),
            });
            const body = (await response.json().catch(() => ({}))) as { error?: string };

            if (!response.ok) {
                throw new Error(body.error ?? 'Unable to create a server session.');
            }

            router.push('/dashboard');
            router.refresh();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
            setLoading(false);
        }
    }

    return (
        <div className='w-full max-w-sm rounded-lg bg-white p-8 shadow-xs ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10'>
            <div className='flex gap-3 mb-8 items-center justify-center'>
                <Image
                    src='/web-app-manifest-192x192.png'
                    alt='Green Room'
                    width={192}
                    height={192}
                    className='size-10 rounded-lg'
                    priority
                />
                <h1 className='text-3xl/8 font-semibold tracking-tight text-zinc-950 dark:text-white'>GRC CRM</h1>
            </div>

            {error ?
                <div className='mb-4 rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20 dark:text-red-400'>{error}</div>
                : null
            }

            <Button type='button' className='w-full' onClick={signIn} disabled={loading}>
                {loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                Sign In
            </Button>
        </div>
    );
}
