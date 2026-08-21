import { NextResponse } from 'next/server';
import { requireNonGuest } from '@/lib/auth/session';
import { ensureInvoicePdf } from '@/lib/data/orders';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ orderId: string }> }
): Promise<Response> {
    try {
        await requireNonGuest();
        const { orderId } = await params;
        const url = await ensureInvoicePdf(orderId);
        return NextResponse.redirect(url);
    } catch (error) {
        console.error('Failed to generate PDF invoice:', error);
        return new Response('Failed to generate PDF invoice', { status: 500 });
    }
}
