// Deutsche Texte. Formelle Anrede (Sie). EN/DE müssen synchron bleiben.

export const de = {
  appName: "Mein Profil",
  nav: {
    overview: "Profil",
    edit: "Profil bearbeiten",
    privacy: "Datenschutz & Einwilligungen",
    data: "Daten & Konto",
    logout: "Abmelden",
  },
  identity: {
    viaKobilIdentity: "über KOBIL Identity",
    emailReadOnly: "Ihre E-Mail-Adresse wird von KOBIL Identity verwaltet.",
    emailVerified: "E-Mail bestätigt",
    emailNotVerified: "E-Mail nicht bestätigt",
  },
  overview: {
    title: "Profil",
    emptyBio: "Noch keine Kurzbeschreibung.",
    visibilityLabel: "Sichtbarkeit",
    edit: "Profil bearbeiten",
  },
  edit: {
    title: "Profil bearbeiten",
    fields: {
      display_name: "Anzeigename",
      avatar_url: "Avatar-URL",
      bio: "Kurzbeschreibung",
      locale: "Sprache",
      timezone: "Zeitzone",
      phone: "Telefon (nur Produktnutzung)",
      address: "Adresse",
      profile_visibility: "Sichtbarkeit",
    },
    helpers: {
      optional:
        "Optional. Wird nur zur Personalisierung Ihres Profils verwendet. Sie können dies jederzeit entfernen.",
      phone:
        "Optional. Diese Telefonnummer wird vom Produkt verwaltet und ist nicht Ihre Login-/MFA-Nummer. Sie können dies jederzeit entfernen.",
      address: "Optional. Sie können dies jederzeit entfernen.",
    },
    visibilityOptions: {
      private: "Privat — nur Sie sehen dies",
      miniapps: "Miniapps — andere Funktionen in der App sehen dies",
      public: "Öffentlich",
    },
    save: "Änderungen speichern",
    saved: "Gespeichert",
    error: "Änderungen konnten nicht gespeichert werden.",
  },
  privacy: {
    title: "Datenschutz & Einwilligungen",
    intro:
      "Sie steuern optionale Datenverwendungen wie Marketing, Analytics, Personalisierung und Partner-Miniapps.",
    purposes: {
      marketing_email: {
        title: "Marketing-E-Mails",
        description:
          "Wir dürfen Ihnen Newsletter und Werbeaktionen per E-Mail senden.",
      },
      personalized_offers: {
        title: "Personalisierte Angebote",
        description:
          "Wir dürfen Angebote und Inhalte an Ihre Interessen und Ihr Verhalten anpassen.",
      },
      analytics: {
        title: "Produkt-Analytics",
        description:
          "Wir dürfen anonymisierte Nutzungsdaten erheben, um das Produkt zu verbessern.",
      },
      partner_miniapp_sharing: {
        title: "Teilen mit Partner-Miniapps",
        description:
          "Andere Miniapps in dieser Superapp dürfen Ihre Profil-Basisdaten lesen.",
      },
      product_notifications: {
        title: "Produkt-Benachrichtigungen",
        description:
          "Wichtige Produktankündigungen sind erlaubt (Transaktionsmeldungen werden immer gesendet).",
      },
    },
    lastUpdated: "Zuletzt aktualisiert",
    grant: "Erlauben",
    revoke: "Widerrufen",
  },
  data: {
    title: "Daten & Konto",
    exportTitle: "Meine Daten herunterladen",
    exportDescription:
      "Erhalten Sie eine JSON-Kopie Ihrer Profildaten, Datenschutz-Einstellungen und Anfragen.",
    exportButton: "Herunterladen",
    deleteTitle: "Profil löschen",
    deleteDescription:
      "Das Löschen Ihres Profils entfernt oder anonymisiert Ihre Profildaten. Einige Datensätze können aufbewahrt werden, sofern gesetzlich erforderlich.",
    deleteButton: "Profil löschen",
    deleteConfirmTitle: "Profillöschung bestätigen",
    deleteConfirmBody:
      "Dies markiert Ihr Profil zur Löschung und anonymisiert Ihre bearbeitbaren Daten. Einige Datensätze können aufbewahrt werden, sofern gesetzlich erforderlich. Dies kann nicht rückgängig gemacht werden.",
    deleteConfirm: "Ja, Profil löschen",
    deleteCancel: "Abbrechen",
    requestsTitle: "Ihre Datenschutz-Anfragen",
    requestsEmpty: "Noch keine Anfragen.",
    requestType: { export: "Datenexport", deletion: "Profillöschung" },
    requestStatus: {
      received: "Erhalten",
      in_progress: "In Bearbeitung",
      completed: "Abgeschlossen",
      rejected: "Abgelehnt",
    },
  },
  errors: {
    sessionExpired: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
    server: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    validation: "Bitte prüfen Sie die markierten Felder.",
  },
} as const;
