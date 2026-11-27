import type { ChangelogMessages } from "./en.ts";

/** Change log texts in Italian: same keys as en.ts, checked by the type. */
export const it: ChangelogMessages = {
  added: "{count} aggiunti",
  changed: "{count} modificati",
  description: "Le modifiche a questo record, dalla più recente.",
  edited: "modificate",
  element: { added: "aggiunto", removed: "rimosso" },
  empty: {
    description: "Le modifiche compaiono qui quando il record viene modificato.",
    title: "Ancora nessuna modifica",
  },
  loadError: "Impossibile caricare la cronologia. Riprova.",
  loadMore: "Carica altro",
  loading: "Caricamento della cronologia…",
  noFields: "Nessun campo modificato.",
  open: "Cronologia",
  operations: {
    create: "l'ha creato",
    delete: "l'ha eliminato",
    transition: "ha cambiato lo stato",
    update: "l'ha modificato",
  },
  removed: "{count} rimossi",
  retry: "Riprova",
  set: "aggiunte",
  someone: "Qualcuno",
  title: "Cronologia",
};
