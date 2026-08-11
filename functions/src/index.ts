import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();

function millis(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }

  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).getTime();
  }

  return null;
}

export const healthCheck = onRequest((_request, response) => {
  response.json({ status: "ok", service: "greenroom-grc", ts: new Date().toISOString() });
});

export const onInteractionCreated = onDocumentCreated("companies/{companyId}/interactions/{interactionId}", async (event) => {
  const snapshot = event.data;
  const companyId = event.params.companyId;
  if (!snapshot || !companyId) {
    return;
  }

  const interaction = snapshot.data();
  const contactDateTime = interaction.contact_date_time ?? FieldValue.serverTimestamp();
  const interactionMethod = typeof interaction.interaction_method === "string" ? interaction.interaction_method : null;
  const companyRef = db.doc(`companies/${companyId}`);
  const companySnapshot = await companyRef.get();
  const company = companySnapshot.data();

  if (company?.last_interaction_method === interactionMethod && millis(company.last_interaction_at) === millis(contactDateTime)) {
    return;
  }

  await companyRef.set(
    {
      last_interaction_at: contactDateTime,
      last_interaction_method: interactionMethod,
      interaction_count: FieldValue.increment(1),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
});
