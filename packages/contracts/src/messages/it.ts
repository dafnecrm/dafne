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
  },
  products: {
    notFound: 'Prodotto non trovato',
    name: { required: 'Inserisci il nome' },
  },
  users: {
    notFound: 'Utente non trovato',
    firstname: { required: 'Inserisci il nome' },
    lastname: { required: 'Inserisci il cognome' },
    email: { taken: 'Esiste già un utente con questa email' },
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
      quantity: { required: 'Inserisci la quantità' },
    },
    type: { required: 'Inserisci il tipo' },
    typeId: { required: 'Enter the type id' },
    status: { required: 'Scegli lo stato' }
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
};
