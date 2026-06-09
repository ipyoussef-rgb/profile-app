// English fallback. Keep keys in sync with de.ts.

export const en = {
  appName: "My Profile",
  brand: "KOBIL",
  nav: {
    overview: "Profile",
    edit: "Edit profile",
    attributes: "Interests",
    privacy: "Privacy",
    data: "Data & account",
    logout: "Sign out",
  },
  identity: {
    sectionTitle: "Identity attributes (from KOBIL Identity)",
    sectionHelper:
      "These attributes are managed in KOBIL Identity. Changes are synced directly to your identity account.",
    viaKobilIdentity: "via KOBIL Identity",
    emailReadOnly: "Your email is managed by KOBIL Identity.",
    emailVerified: "Email verified",
    emailNotVerified: "Email not verified",
    notConfigured:
      "KOBIL Identity API is not configured (KOBIL_SERVICE_CLIENT_ID/SECRET missing).",
  },
  fields: {
    first_name: "First name",
    last_name: "Last name",
    username: "Username",
    email: "Email",
    phone: "Phone",
    locale: "Language",
    birthdate: "Date of birth",
    address: "Address",
    street: "Street",
    locality: "City",
    postal_code: "Postal code",
    country: "Country (e.g. DE)",
    display_name: "Display name",
    avatar_url: "Avatar URL",
    profile_visibility: "Profile visibility",
  },
  overview: {
    title: "Profile",
    visibilityLabel: "Visibility",
    edit: "Edit profile",
    ageOver16: "Over 16",
    ageOver18: "Over 18",
    ageUnknown: "Date of birth not on file",
    yes: "yes",
    no: "no",
  },
  edit: {
    title: "Edit identity attributes",
    appTitle: "App profile",
    appHelper:
      "These fields live in the Profile-Service database, not in KOBIL Identity.",
    helpers: {
      optional: "Optional. Used only to personalize your profile. You can remove this at any time.",
      address: "Optional. You can remove this at any time.",
    },
    visibilityOptions: {
      private: "Private — only you can see this",
      miniapps: "Miniapps — visible to other features inside the app",
      public: "Public",
    },
    saveIdentity: "Save identity attributes",
    saveApp: "Save app profile",
    securityTitle: "Login & security",
    saved: "Saved",
    error: "Could not save changes.",
    changeEmail: "Change email",
    changePhone: "Change phone number",
    changePassword: "Change password",
    idpHelper:
      "Email, phone, and password changes are handled by KOBIL Identity. After you finish, you will be redirected back to your profile.",
  },
  privacy: {
    title: "Privacy & consents",
    intro:
      "You control optional data uses such as marketing, analytics, personalization, and partner miniapp sharing.",
    purposes: {
      marketing_email: {
        title: "Marketing email",
        description:
          "Allow us to send you marketing newsletters and promotional offers by email.",
      },
      personalized_offers: {
        title: "Personalized offers",
        description:
          "Allow us to tailor offers and content to your interests and behaviour.",
      },
      analytics: {
        title: "Product analytics",
        description:
          "Allow us to collect anonymized usage analytics to improve the product.",
      },
      partner_miniapp_sharing: {
        title: "Partner miniapp sharing",
        description:
          "Allow other miniapps inside this superapp to read your profile basics.",
      },
      product_notifications: {
        title: "Product notifications",
        description:
          "Allow important product announcements (transactional notices are always sent).",
      },
    },
    lastUpdated: "Last updated",
    grant: "Allow",
    revoke: "Withdraw",
  },
  data: {
    title: "Data & account",
    exportTitle: "Download my data",
    exportDescription:
      "Get a JSON copy of your profile data, privacy choices, and request history.",
    exportButton: "Download",
    deleteTitle: "Delete my profile",
    deleteDescription:
      "Deleting your profile removes or anonymizes your profile data. Some records may be retained where legally required.",
    deleteButton: "Delete profile",
    deleteConfirmTitle: "Confirm profile deletion",
    deleteConfirmBody:
      "This will mark your profile for deletion and anonymize your editable data. Some records may be retained where legally required. This cannot be undone.",
    deleteConfirm: "Yes, delete my profile",
    deleteCancel: "Cancel",
    requestsTitle: "Your privacy requests",
    requestsEmpty: "No privacy requests yet.",
    requestType: { export: "Data export", deletion: "Profile deletion" },
    requestStatus: {
      received: "Received",
      in_progress: "In progress",
      completed: "Completed",
      rejected: "Rejected",
    },
  },
  attributes: {
    title: "Interests & traits",
    saveHint: "Optional. Used to personalize your profile — you can remove your selection at any time.",
    save: "Save",
  },
  back: {
    toProfile: "Back to profile",
  },
  errors: {
    sessionExpired: "Your session has expired. Please sign in again.",
    server: "Something went wrong. Please try again.",
    validation: "Please check the highlighted fields.",
  },
} as const;
