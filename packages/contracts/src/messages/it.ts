import type { ContractMessages } from './en.ts';

/** Italian texts of the contracts' message keys (see en.ts). */
export const it: ContractMessages = {
  common: {
    date: { invalid: 'Inserisci una data valida' },
    email: { invalid: 'Inserisci un indirizzo email valido' },
    number: { invalid: 'Inserisci un numero' },
  },
  customers: {
    notFound: 'Cliente non trovato',
    type: {
      required: 'Scegli il tipo',
      locked: 'Il tipo non può essere cambiato dopo la creazione del cliente',
    },
    name: { required: 'Inserisci il nome' },
    fiscalCode: { invalid: 'Inserisci un codice fiscale valido' },
    vatNumber: { invalid: 'Inserisci una partita IVA valida' },
    email: {
      required: "Inserisci l'email",
      taken: 'Esiste già un cliente con questa email',
    },
    phone: { invalid: 'Inserisci un numero di telefono valido' },
    addresses: {
      typeTaken: 'Un altro indirizzo ha già questo tipo',
      country: "Scegli il paese dall'elenco",
    },
    language: { required: 'Scegli la lingua' },
  },
  customerAddresses: {
    type: { required: 'Scegli il tipo' },
    street: { required: 'Inserisci la via' },
    city: { required: 'Inserisci la città' },
    countryCode: { required: 'Scegli il paese' },
  },
  activities: {
    notFound: 'Attività non trovata',
    notOpen: 'Attività non trovata o chiusa',
    notClosed: 'Attività non trovata o non chiusa',
    name: { required: 'Inserisci il nome' },
    type: { required: 'Scegli il tipo' },
    status: { required: 'Scegli lo stato' },
  },
  products: {
    notFound: 'Prodotto non trovato',
    name: { required: 'Inserisci il nome' },
    uomId: { required: "Scegli l'unità di misura", notFound: "Scegli un'unità di misura dall'elenco" },
    units: {
      uomId: {
        required: "Scegli l'unità",
        base: "L'unità di base è già un'unità del prodotto",
        duplicate: 'Due unità sono uguali',
        notFound: "Scegli un'unità dall'elenco",
        notConvertible: "L'unità di base non ha una conversione verso questa unità",
      },
    },
    used: 'Il prodotto è utilizzato.',
  },
  users: {
    notFound: 'Utente non trovato',
    firstname: { required: 'Inserisci il nome' },
    lastname: { required: 'Inserisci il cognome' },
    email: { taken: 'Esiste già un utente con questa email' },
    role: { superAdminRequired: 'Solo un super-admin può assegnare il ruolo super-admin' },
  },
  database: {
    duplicate: 'Esiste già un record con questi dati',
    missingReference: 'Un record a cui questo fa riferimento non esiste',
    stillReferenced: 'Altri record usano ancora questo',
    required: 'Manca un valore obbligatorio',
    invalid: 'Un valore non è valido',
  },
  fsm: {
    transitionNotAllowed: 'Lo stato non può passare a questo valore',
    transitionForbidden: 'Lo stato non può essere cambiato ora',
  },
  geo: {
    q: { required: 'Inserisci cosa cercare' },
    unavailable: 'La ricerca indirizzi non è disponibile. Riprova più tardi.',
  },
  salesOrders: {
    notFound: 'Ordine di vendita non trovato',
    customerId: {
      required: 'Inserisci il cliente',
      notFound: 'Scegli un cliente dall\'elenco',
    },
    items: {
      notFound: 'Riga dell\'ordine di vendita non trovata',
      position: {
        required: 'Inserisci la posizione',
        duplicate: 'Due righe hanno la stessa posizione',
      },
      productId: {
        required: 'Inserisci il prodotto',
        notFound: 'Scegli un prodotto esistente'
      },
      quantity: { required: 'Inserisci la quantità', positive: 'La quantità deve essere maggiore di zero' },
      uomId: {
        notFound: "Scegli un'unità di misura dall'elenco",
        notConvertible: 'Il prodotto non si vende in questa unità',
      },
      enterAtLeastOneItem: 'Inserisci almeno un articolo',
    },
    typeId: {
      required: 'Inserisci il tipo ordine',
      notFound: 'Scegli un tipo ordine dall\'elenco',
    },
    status: {
      required: 'Scegli lo stato',
      mustBeDraft: 'Lo stato non è Bozza',
    },
    customer: {
      noShippingAddress: 'Il cliente non ha indirizzo di spedizione',
      noBillingAddress: 'Il cliente non ha indirizzo di fatturazione',
    }
  },
  salesOrderTypes: {
    notFound: 'Tipo ordine non trovato',
    id: {
      required: 'Inserisci il tipo',
      taken: 'Questo codice è già in uso'
    },
    description: {
      required: 'Inserisci la descrizione'
    },
  },
  assistantProviders: {
    notFound: 'Provider IA non trovato',
    name: { required: 'Inserisci il nome' },
    kind: { required: 'Scegli il tipo' },
    baseUrl: {
      invalid: 'Inserisci un URL che inizi con http:// o https://',
      required: "Inserisci l'URL del server (es. http://localhost:11434/v1 per Ollama)",
    },
    apiKeyEnv: { invalid: "Usa il nome di una variabile d'ambiente, es. ANTHROPIC_API_KEY" },
  },
  assistantModels: {
    notFound: 'Modello IA non trovato',
    providerId: { required: 'Scegli il provider' },
    modelId: { required: "Inserisci l'id del modello" },
    label: { required: "Inserisci l'etichetta" },
  },
  assistantAgents: {
    notFound: 'Agente IA non trovato',
    name: { required: 'Inserisci il nome' },
    systemPrompt: { required: 'Inserisci le istruzioni' },
    defaultModelId: { required: 'Scegli il modello predefinito' },
    groupIds: { required: 'Scegli almeno un gruppo' },
  },
  permissions: {
    unknown: 'Permesso sconosciuto',
    forbidden: 'Non hai il permesso di farlo',
  },
  assistant: {
    tools: { unknown: 'Strumento sconosciuto' },
    agent: { required: 'Scegli un agente', unavailable: 'Questo agente non è disponibile' },
    model: {
      required: 'Scegli un modello',
      unavailable: 'Questo modello non è disponibile',
      notAllowed: 'Questo agente non permette di cambiare modello',
      none: 'Questo agente non ha un modello: chiedi a un super-admin di impostarlo',
    },
    provider: {
      unavailable: 'Il provider IA non è raggiungibile in questo momento',
      missingKey: 'Il provider IA non ha una chiave API configurata',
    },
    message: { required: 'Scrivi un messaggio', tooLong: 'Il messaggio è troppo lungo' },
    conversation: { notFound: 'Conversazione non trovata' },
    action: { notFound: 'Azione non trovata', notPending: 'Questa azione è già stata decisa' },
    rateLimited: 'Troppi messaggi: attendi qualche minuto',
    failed: "L'assistente non è riuscito a rispondere: riprova",
    noAnswer: "L'assistente non ha risposto: prova a chiedere in altro modo",
  },
  userGroups: { notFound: 'Gruppo non trovato', name: { required: 'Inserisci il nome' } },
  uoms: {
    notFound: 'Unità di misura non trovata',
    id: { required: 'Inserisci il simbolo', taken: 'Questo simbolo è già in uso' },
    name: { required: 'Inserisci il nome' },
    kind: { required: 'Scegli il tipo' },
    factor: { required: 'Inserisci il fattore', positive: 'Il fattore deve essere maggiore di zero' },
  },
  uomConversions: {
    notFound: 'Conversione non trovata',
    fromUomId: { required: "Scegli l'unità" },
    toUomId: { required: "Scegli l'unità", self: "Un'unità non può convertirsi in sé stessa" },
    uomNotFound: "Scegli un'unità dall'elenco",
    otherKind: 'Le due unità devono essere dello stesso tipo',
    taken: 'Queste due unità hanno già una conversione',
  },
  quotations: {
    notFound: 'Offerta non trovata',
    customerId: {
      required: "Inserisci l'id del cliente",
      notFound: "Scegli un cliente dall'elenco",
    },
    typeId: {
      required: "Inserisci il tipo dell'offerta",
      notFound: "Scegli un tipo dall'elenco",
    },
    items: {
      notFound: "Riga dell'offerta non trovata",
      enterAtLeastOneItem: 'Inserisci almeno una riga',
    },
    status: {
      required: 'Scegli lo stato',
      mustBeDraft: 'Solo un\'offerta in bozza può essere modificata',
    },
  },
  documentTemplates: {
    notFound: 'Modello di documento non trovato',
    name: { required: 'Inserisci il nome' },
    language: { required: 'Scegli la lingua' },
    resource: { required: 'Inserisci la risorsa', unknown: 'Per questa risorsa non si possono creare documenti' },
    file: {
      missing: 'Carica un file .docx',
      notDocx: 'Il modello deve essere un file Word (.docx)',
      tooLarge: 'Il modello supera i 5 MB',
      invalid: 'Il modello contiene errori: correggili in Word e caricalo di nuovo',
      none: 'Questo modello non ha ancora un file',
    },
  },
  documents: {
    unknownResource: 'Per questa risorsa non si possono creare documenti',
    noTemplate: 'Non è ancora stato caricato un modello per questo documento',
    conversionFailed: 'Non è stato possibile creare il PDF: riprova più tardi',
  },
  notifications: {
    emailNotSent: 'Email couldn\'t be sent'
  },
  tasks: {
    notFound: 'Attività pianificata non trovata',
    alreadyRunning: "Quest'attività è già in esecuzione: riprova quando termina",
    disabled: "Quest'attività è disattivata",
    cron: { invalid: 'Inserisci un\'espressione cron valida (es. 0 2 * * *)' },
    timezone: {
      required: 'Inserisci il fuso orario',
      invalid: 'Inserisci un fuso orario valido (es. Europe/Rome)',
    },
    timeoutSeconds: { invalid: 'Inserisci un numero di secondi, da 1 a 86400' },
    run: {
      notFound: 'Esecuzione non trovata',
      timedOut: "L'esecuzione ha superato il tempo massimo",
      workerLost: "L'esecuzione è stata interrotta (l'app delle attività si è fermata)",
      unknownTask: "L'app delle attività non definisce più quest'attività",
    },
  },
};
