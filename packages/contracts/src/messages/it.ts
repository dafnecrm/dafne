import type { ContractMessages } from './en.ts';

/** Italian texts of the contracts' message keys (see en.ts). */
export const it: ContractMessages = {
  activities: {
    name: { required: 'Inserisci il nome' },
    notClosed: 'Attività non trovata o non chiusa',
    notFound: 'Attività non trovata',
    notOpen: 'Attività non trovata o chiusa',
    status: { required: 'Scegli lo stato' },
    type: { required: 'Scegli il tipo' },
  },
  assistant: {
    action: { notFound: 'Azione non trovata', notPending: 'Questa azione è già stata decisa' },
    agent: { required: 'Scegli un agente', unavailable: 'Questo agente non è disponibile' },
    conversation: { notFound: 'Conversazione non trovata' },
    failed: "L'assistente non è riuscito a rispondere: riprova",
    message: { required: 'Scrivi un messaggio', tooLong: 'Il messaggio è troppo lungo' },
    model: {
      none: 'Questo agente non ha un modello: chiedi a un super-admin di impostarlo',
      notAllowed: 'Questo agente non permette di cambiare modello',
      required: 'Scegli un modello',
      unavailable: 'Questo modello non è disponibile',
    },
    noAnswer: "L'assistente non ha risposto: prova a chiedere in altro modo",
    provider: {
      missingKey: 'Il provider IA non ha una chiave API configurata',
      unavailable: 'Il provider IA non è raggiungibile in questo momento',
    },
    rateLimited: 'Troppi messaggi: attendi qualche minuto',
    tools: { unknown: 'Strumento sconosciuto' },
  },
  assistantAgents: {
    defaultModelId: { required: 'Scegli il modello predefinito' },
    groupIds: { required: 'Scegli almeno un gruppo' },
    name: { required: 'Inserisci il nome' },
    notFound: 'Agente IA non trovato',
    systemPrompt: { required: 'Inserisci le istruzioni' },
  },
  assistantModels: {
    label: { required: "Inserisci l'etichetta" },
    modelId: { required: "Inserisci l'id del modello" },
    notFound: 'Modello IA non trovato',
    providerId: { required: 'Scegli il provider' },
  },
  assistantProviders: {
    apiKeyEnv: { invalid: "Usa il nome di una variabile d'ambiente, es. ANTHROPIC_API_KEY" },
    baseUrl: {
      invalid: 'Inserisci un URL che inizi con http:// o https://',
      required: "Inserisci l'URL del server (es. http://localhost:11434/v1 per Ollama)",
    },
    kind: { required: 'Scegli il tipo' },
    name: { required: 'Inserisci il nome' },
    notFound: 'Provider IA non trovato',
  },
  common: {
    date: { invalid: 'Inserisci una data valida' },
    email: { invalid: 'Inserisci un indirizzo email valido' },
    number: { invalid: 'Inserisci un numero' },
  },
  customerAddresses: {
    city: { required: 'Inserisci la città' },
    countryCode: { required: 'Scegli il paese' },
    street: { required: 'Inserisci la via' },
    type: { required: 'Scegli il tipo' },
  },
  customers: {
    addresses: {
      country: "Scegli il paese dall'elenco",
      typeTaken: 'Un altro indirizzo ha già questo tipo',
    },
    email: {
      required: "Inserisci l'email",
      taken: 'Esiste già un cliente con questa email',
    },
    fiscalCode: { invalid: 'Inserisci un codice fiscale valido' },
    language: { required: 'Scegli la lingua' },
    name: { required: 'Inserisci il nome' },
    notFound: 'Cliente non trovato',
    phone: { invalid: 'Inserisci un numero di telefono valido' },
    type: {
      locked: 'Il tipo non può essere cambiato dopo la creazione del cliente',
      required: 'Scegli il tipo',
    },
    vatNumber: { invalid: 'Inserisci una partita IVA valida' },
  },
  database: {
    duplicate: 'Esiste già un record con questi dati',
    invalid: 'Un valore non è valido',
    missingReference: 'Un record a cui questo fa riferimento non esiste',
    required: 'Manca un valore obbligatorio',
    stillReferenced: 'Altri record usano ancora questo',
  },
  documentTemplates: {
    file: {
      invalid: 'Il modello contiene errori: correggili in Word e caricalo di nuovo',
      missing: 'Carica un file .docx',
      none: 'Questo modello non ha ancora un file',
      notDocx: 'Il modello deve essere un file Word (.docx)',
      tooLarge: 'Il modello supera i 5 MB',
    },
    language: { required: 'Scegli la lingua' },
    name: { required: 'Inserisci il nome' },
    notFound: 'Modello di documento non trovato',
    resource: { required: 'Inserisci la risorsa', unknown: 'Per questa risorsa non si possono creare documenti' },
  },
  documents: {
    conversionFailed: 'Non è stato possibile creare il PDF: riprova più tardi',
    noTemplate: 'Non è ancora stato caricato un modello per questo documento',
    unknownResource: 'Per questa risorsa non si possono creare documenti',
  },
  fsm: {
    transitionForbidden: 'Lo stato non può essere cambiato ora',
    transitionNotAllowed: 'Lo stato non può passare a questo valore',
  },
  geo: {
    q: { required: 'Inserisci cosa cercare' },
    unavailable: 'La ricerca indirizzi non è disponibile. Riprova più tardi.',
  },
  notifications: {
    emailNotSent: 'Email couldn\'t be sent'
  },
  permissions: {
    forbidden: 'Non hai il permesso di farlo',
    unknown: 'Permesso sconosciuto',
  },
  products: {
    name: { required: 'Inserisci il nome' },
    notFound: 'Prodotto non trovato',
    units: {
      uomId: {
        base: "L'unità di base è già un'unità del prodotto",
        duplicate: 'Due unità sono uguali',
        notConvertible: "L'unità di base non ha una conversione verso questa unità",
        notFound: "Scegli un'unità dall'elenco",
        required: "Scegli l'unità",
      },
    },
    uomId: { notFound: "Scegli un'unità di misura dall'elenco", required: "Scegli l'unità di misura" },
    used: 'Il prodotto è utilizzato.',
  },
  quotations: {
    customerId: {
      notFound: "Scegli un cliente dall'elenco",
      required: "Inserisci l'id del cliente",
    },
    items: {
      enterAtLeastOneItem: 'Inserisci almeno una riga',
      notFound: "Riga dell'offerta non trovata",
    },
    notFound: 'Offerta non trovata',
    status: {
      mustBeDraft: 'Solo un\'offerta in bozza può essere modificata',
      required: 'Scegli lo stato',
    },
    typeId: {
      notFound: "Scegli un tipo dall'elenco",
      required: "Inserisci il tipo dell'offerta",
    },
  },
  salesOrderTypes: {
    description: {
      required: 'Inserisci la descrizione'
    },
    id: {
      required: 'Inserisci il tipo',
      taken: 'Questo codice è già in uso'
    },
    notFound: 'Tipo ordine non trovato',
  },
  salesOrders: {
    customer: {
      noBillingAddress: 'Il cliente non ha indirizzo di fatturazione',
      noShippingAddress: 'Il cliente non ha indirizzo di spedizione',
    },
    customerId: {
      notFound: 'Scegli un cliente dall\'elenco',
      required: 'Inserisci il cliente',
    },
    items: {
      enterAtLeastOneItem: 'Inserisci almeno un articolo',
      notFound: 'Riga dell\'ordine di vendita non trovata',
      position: {
        duplicate: 'Due righe hanno la stessa posizione',
        required: 'Inserisci la posizione',
      },
      productId: {
        notFound: 'Scegli un prodotto esistente',
        required: 'Inserisci il prodotto'
      },
      quantity: { positive: 'La quantità deve essere maggiore di zero', required: 'Inserisci la quantità' },
      uomId: {
        notConvertible: 'Il prodotto non si vende in questa unità',
        notFound: "Scegli un'unità di misura dall'elenco",
      },
    },
    notFound: 'Ordine di vendita non trovato',
    status: {
      mustBeDraft: 'Lo stato non è Bozza',
      required: 'Scegli lo stato',
    },
    typeId: {
      notFound: 'Scegli un tipo ordine dall\'elenco',
      required: 'Inserisci il tipo ordine',
    }
  },
  tasks: {
    alreadyRunning: "Quest'attività è già in esecuzione: riprova quando termina",
    cron: { invalid: 'Inserisci un\'espressione cron valida (es. 0 2 * * *)' },
    disabled: "Quest'attività è disattivata",
    notFound: 'Attività pianificata non trovata',
    run: {
      notFound: 'Esecuzione non trovata',
      timedOut: "L'esecuzione ha superato il tempo massimo",
      unknownTask: "L'app delle attività non definisce più quest'attività",
      workerLost: "L'esecuzione è stata interrotta (l'app delle attività si è fermata)",
    },
    timeoutSeconds: { invalid: 'Inserisci un numero di secondi, da 1 a 86400' },
    timezone: {
      invalid: 'Inserisci un fuso orario valido (es. Europe/Rome)',
      required: 'Inserisci il fuso orario',
    },
  },
  uomConversions: {
    fromUomId: { required: "Scegli l'unità" },
    notFound: 'Conversione non trovata',
    otherKind: 'Le due unità devono essere dello stesso tipo',
    taken: 'Queste due unità hanno già una conversione',
    toUomId: { required: "Scegli l'unità", self: "Un'unità non può convertirsi in sé stessa" },
    uomNotFound: "Scegli un'unità dall'elenco",
  },
  uoms: {
    factor: { positive: 'Il fattore deve essere maggiore di zero', required: 'Inserisci il fattore' },
    id: { required: 'Inserisci il simbolo', taken: 'Questo simbolo è già in uso' },
    kind: { required: 'Scegli il tipo' },
    name: { required: 'Inserisci il nome' },
    notFound: 'Unità di misura non trovata',
  },
  userGroups: { name: { required: 'Inserisci il nome' }, notFound: 'Gruppo non trovato' },
  users: {
    email: { taken: 'Esiste già un utente con questa email' },
    firstname: { required: 'Inserisci il nome' },
    lastname: { required: 'Inserisci il cognome' },
    notFound: 'Utente non trovato',
    role: { superAdminRequired: 'Solo un super-admin può assegnare il ruolo super-admin' },
  },
};
