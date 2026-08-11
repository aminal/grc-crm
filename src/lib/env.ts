import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
});

const serverSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  FIREBASE_ALLOWED_DOMAIN: z.string().min(1).default("greenroomcannabis.com"),
  FIREBASE_USE_EMULATORS: z.enum(["true", "false"]).default("false"),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function formatEnvError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function getClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
  });
  if (!parsed.success) {
    throw new Error(`Invalid Firebase client environment: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}

export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid Firebase server environment: ${formatEnvError(parsed.error)}`);
  }

  const hasPartialServiceAccount = Boolean(parsed.data.FIREBASE_CLIENT_EMAIL || parsed.data.FIREBASE_PRIVATE_KEY);
  const hasFullServiceAccount = Boolean(parsed.data.FIREBASE_PROJECT_ID && parsed.data.FIREBASE_CLIENT_EMAIL && parsed.data.FIREBASE_PRIVATE_KEY);
  if (hasPartialServiceAccount && !hasFullServiceAccount) {
    throw new Error("FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY must be provided together.");
  }

  const emulatorHostKeys = ["FIREBASE_AUTH_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"] as const;
  if (parsed.data.FIREBASE_USE_EMULATORS === "true") {
    const missing = emulatorHostKeys.filter((key) => !parsed.data[key]?.trim());
    if (missing.length > 0) {
      throw new Error(`FIREBASE_USE_EMULATORS=true requires ${missing.join(", ")} to be configured.`);
    }
  } else {
    const configured = emulatorHostKeys.filter((key) => parsed.data[key]?.trim());
    if (configured.length > 0) {
      throw new Error(`${configured.join(", ")} should be empty unless FIREBASE_USE_EMULATORS=true.`);
    }
  }

  return parsed.data;
}

export function getAllowedEmailDomain(): string {
  return (process.env.FIREBASE_ALLOWED_DOMAIN || "greenroomcannabis.com").trim().toLowerCase();
}

export function shouldUseFirebaseEmulators(): boolean {
  return process.env.FIREBASE_USE_EMULATORS === "true";
}
