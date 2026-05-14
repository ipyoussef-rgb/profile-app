// English GDPR + product copy. EN/DE must stay in sync.

export const en = {
  appName: "My Profile",
  nav: {
    overview: "Profile",
    edit: "Edit profile",
    privacy: "Privacy & consents",
    data: "Data & account",
    logout: "Sign out",
  },
  identity: {
    viaKobilIdentity: "via KOBIL Identity",
    emailReadOnly: "Your email is managed by KOBIL Identity.",
    emailVerified: "Email verified",
    emailNotVerified: "Email not verified",
  },
  overview: {
    title: "Profile",
    emptyBio: "No bio yet.",
    visibilityLabel: "Profile visibility",
    edit: "Edit profile",
  },
  edit: {
    title: "Edit profile",
    fields: {
      display_name: "Display name",
      avatar_url: "Avatar URL",
      bio: "Bio",
      locale: "Language",
      timezone: "Timezone",
      phone: "Phone (product use only)",
      address: "Address",
      profile_visibility: "Profile visibility",
    },
    helpers: {
      optional: "Optional. Used only to personalize your profile. You can remove this at any time.",
      phone:
        "Optional. This phone is product-managed and is not your login/MFA phone. You can remove this at any time.",
      address: "Optional. You can remove this at any time.",
    },
    visibilityOptions: {
      private: "Private — only you can see this",
      miniapps: "Miniapps — visible to other features inside the app",
      public: "Public",
    },
    save: "Save changes",
    saved: "Saved",
    error: "Could not save changes.",
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
  errors: {
    sessionExpired: "Your session has expired. Please sign in again.",
    server: "Something went wrong. Please try again.",
    validation: "Please check the highlighted fields.",
  },
} as const;
