// Standard-Sprache der App. Formelle Anrede (Sie).

export const de = {
  appName: "Mein Profil",
  brand: "KOBIL",
  nav: {
    overview: "Profil",
    edit: "Profil bearbeiten",
    attributes: "Interessen",
    postfach: "Postfach",
    comingSoon: "Coming soon",
    privacy: "Datenschutz",
    data: "Daten & Konto",
    logout: "Abmelden",
  },
  identity: {
    sectionTitle: "Identitätsdaten",
    sectionHelper:
      "Diese Angaben werden zentral gepflegt. Änderungen werden direkt mit Ihrem Identitätskonto synchronisiert.",
    emailReadOnly: "Ihre E-Mail-Adresse wird zentral verwaltet.",
    emailVerified: "E-Mail bestätigt",
    emailNotVerified: "E-Mail nicht bestätigt",
    notConfigured:
      "KOBIL Identity API ist nicht konfiguriert (KOBIL_SERVICE_CLIENT_ID/SECRET fehlen).",
  },
  fields: {
    first_name: "Vorname",
    last_name: "Nachname",
    username: "Benutzername",
    email: "E-Mail",
    phone: "Telefonnummer",
    locale: "Sprache",
    birthdate: "Geburtsdatum",
    address: "Adresse",
    street: "Straße",
    locality: "Ort",
    postal_code: "Postleitzahl",
    country: "Land (z. B. DE)",
    display_name: "Anzeigename",
    avatar_url: "Avatar-URL",
    profile_visibility: "Sichtbarkeit",
  },
  overview: {
    title: "Profil",
    visibilityLabel: "Sichtbarkeit",
    edit: "Profil bearbeiten",
    ageTitle: "Alter",
    ageOver16: "Über 16 Jahre",
    ageOver18: "Über 18 Jahre",
    ageUnknown: "Geburtsdatum nicht hinterlegt",
    yes: "ja",
    no: "nein",
  },
  edit: {
    title: "Identitätsdaten bearbeiten",
    helpers: {
      optional:
        "Optional. Wird nur zur Personalisierung Ihres Profils verwendet. Sie können dies jederzeit entfernen.",
      address: "Optional. Sie können dies jederzeit entfernen.",
    },
    visibilityOptions: {
      private: "Privat — nur Sie sehen dies",
      miniapps: "Miniapps — andere Funktionen in der App sehen dies",
      public: "Öffentlich",
    },
    saveIdentity: "Identitätsdaten speichern",
    securityTitle: "Anmeldung & Sicherheit",
    pageTitle: "Profil bearbeiten",
    saving: "Speichert …",
    saved: "Gespeichert",
    error: "Änderungen konnten nicht gespeichert werden.",
    changeEmail: "E-Mail-Adresse ändern",
    changePhone: "Telefonnummer ändern",
    changePassword: "Passwort ändern",
    idpHelper:
      "E-Mail- und Passwortänderungen werden zentral durchgeführt. Nach Abschluss werden Sie zurück zu Ihrem Profil geleitet.",
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
    deleteConfirmWait: "Bitte warten Sie einen Moment …",
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
  postfach: {
    title: "Postfach",
    intro:
      "Legen Sie die E-Mail-Adresse fest, an die Sie Nachrichten und Benachrichtigungen erhalten möchten. Standardmäßig ist dies Ihre Anmelde-E-Mail.",
    label: "E-Mail-Adresse des Postfachs",
    helper: "An diese Adresse werden Ihre Nachrichten zugestellt.",
    useLoginEmail: "Anmelde-E-Mail übernehmen",
    save: "Postfach speichern",
    saving: "Speichert …",
    saved: "Postfach gespeichert.",
    currentLabel: "Aktuelles Postfach",
    none: "Noch kein Postfach hinterlegt.",
    invalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  },
  attributes: {
    title: "Interessen & Eigenschaften",
    saveHint: "Optional. Wird zur Personalisierung verwendet — Sie können Auswahl jederzeit entfernen.",
    save: "Speichern",
    edit: "Interessen bearbeiten",
    overviewHint: "Ihre unter „Interessen“ gespeicherten Auswahlen.",
    empty: "Sie haben noch nichts ausgewählt.",
    emptyCta: "Jetzt auswählen",
  },
  back: {
    toProfile: "Zurück zum Profil",
  },
  errors: {
    sessionExpired: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
    server: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    validation: "Bitte prüfen Sie die markierten Felder.",
  },
} as const;
