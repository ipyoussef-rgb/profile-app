import { z } from "zod";

export const CONSENT_PURPOSES = [
  "marketing_email",
  "personalized_offers",
  "analytics",
  "partner_miniapp_sharing",
  "product_notifications",
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

// Legal basis per purpose. All are consent-based (Art. 6(1)(a) GDPR) here.
export const LEGAL_BASIS: Record<ConsentPurpose, string> = {
  marketing_email: "consent",
  personalized_offers: "consent",
  analytics: "consent",
  partner_miniapp_sharing: "consent",
  product_notifications: "consent",
};

export const consentUpdateItem = z
  .object({
    purpose: z.enum(CONSENT_PURPOSES),
    granted: z.boolean(),
    source: z.string().min(1).max(60).default("user"),
  })
  .strict();

export const consentUpdateSchema = z
  .object({
    changes: z.array(consentUpdateItem).min(1).max(20),
  })
  .strict();

export type ConsentUpdateInput = z.infer<typeof consentUpdateSchema>;
