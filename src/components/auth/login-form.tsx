'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import {
    clearFirebaseRedirectSignInAttempt,
    completeFirebaseCurrentUserSignIn,
    completeFirebaseRedirectSignIn,
    connectFirebaseAuthEmulator,
    getFirebaseAuth,
    getFirebaseSignInMode,
    googleProvider,
    hasFreshFirebaseRedirectSignInAttempt,
    rememberFirebaseRedirectSignInAttempt,
} from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';

export function LoginForm(): React.ReactElement {
    const router = useRouter();
    const checkedRedirect = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(() => getFirebaseSignInMode() === 'redirect');

    async function createServerSession(idToken: string): Promise<void> {
        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id_token: idToken }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
            throw new Error(body.error ?? 'Unable to create a server session.');
        }
    }

    useEffect(() => {
        if (checkedRedirect.current) {
            return;
        }

        checkedRedirect.current = true;
        connectFirebaseAuthEmulator();

        const allowCurrentUserFallback = hasFreshFirebaseRedirectSignInAttempt();
        if (getFirebaseSignInMode() !== 'redirect' && !allowCurrentUserFallback) {
            return;
        }

        let cancelled = false;

        async function completeRedirect(): Promise<void> {
            try {
                const handledRedirect = await completeFirebaseRedirectSignIn(
                    getFirebaseAuth(),
                    createServerSession,
                    undefined,
                    allowCurrentUserFallback,
                );
                if (cancelled) {
                    return;
                }

                if (handledRedirect) {
                    clearFirebaseRedirectSignInAttempt();
                    router.push('/dashboard');
                    router.refresh();
                    return;
                }

                setLoading(false);
            } catch (caught) {
                if (cancelled) {
                    return;
                }

                clearFirebaseRedirectSignInAttempt();
                setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
                setLoading(false);
            }
        }

        void completeRedirect();

        return () => {
            cancelled = true;
        };
    }, [router]);

    async function signIn(): Promise<void> {
        setError(null);
        setLoading(true);
        connectFirebaseAuthEmulator();

        try {
            const firebaseAuth = getFirebaseAuth();
            if (getFirebaseSignInMode() === 'redirect') {
                if (await completeFirebaseCurrentUserSignIn(firebaseAuth, createServerSession)) {
                    router.push('/dashboard');
                    router.refresh();
                    return;
                }

                rememberFirebaseRedirectSignInAttempt();
                await signInWithRedirect(firebaseAuth, googleProvider);
                return;
            }

            const credential = await signInWithPopup(firebaseAuth, googleProvider);
            const idToken = await credential.user.getIdToken();
            await createServerSession(idToken);
            router.push('/dashboard');
            router.refresh();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
            setLoading(false);
        }
    }

    return (
        <div className='w-full max-w-sm rounded-lg bg-white p-8 shadow-xs ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10'>
            <div className='mb-8 flex items-center justify-center gap-3'>
                <Image
                    src='/web-app-manifest-192x192.png'
                    alt='Green Room Cannabis'
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

            <Button type='button' color='purple' className='w-full' onClick={signIn} disabled={loading}>
                {loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                Sign In
            </Button>
        </div>
    );
}
