export function googleVoiceCallUrl(e164: string, authUserEmail?: string | null): string {
  const params = [`a=nc,${encodeURIComponent(e164)}`];
  const email = authUserEmail?.trim();

  if (email) {
    params.push(`authuser=${encodeURIComponent(email)}`);
  }

  return `https://voice.google.com/calls?${params.join("&")}`;
}
