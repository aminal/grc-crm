import { NextResponse } from "next/server";
import { createSessionCookie, setSessionCookie, syncVerifiedUserFromIdToken } from "@/lib/auth/session";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { id_token?: unknown };
    const idToken = typeof body.id_token === "string" ? body.id_token : "";
    if (!idToken) {
      return NextResponse.json({ error: "Missing Firebase ID token." }, { status: 422 });
    }

    await syncVerifiedUserFromIdToken(idToken);
    const sessionCookie = await createSessionCookie(idToken);
    await setSessionCookie(sessionCookie);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Firebase credential.";
    const status = message.includes("restricted") ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
