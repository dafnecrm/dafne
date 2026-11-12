import type { ChangelogMessages } from "./en.ts";

/** Change log texts in Italian: same keys as en.ts, checked by the type. */
export const it: ChangelogMessages = {
  open: "Cronologia",
  title: "Cronologia",
  description: "Le modifiche a questo record, dalla più recente.",
  someone: "Qualcuno",
  operations: {
    create: "l'ha creato",
    update: "l'ha modificato",
    delete: "l'ha eliminato",
    transition: "ha cambiato lo stato",
  },
  noFields: "Nessun campo modificato.",
  edited: "modificate",
  element: { added: "aggiunto", removed: "rimosso" },
  set: "aggiunte",
  added: "{count} aggiunti",
  removed: "{count} rimossi",
  changed: "{count} modificati",
  loadMore: "Carica altro",
  loading: "Caricamento della cronologia…",
  empty: {
    title: "Ancora nessuna modifica",
    description: "Le modifiche compaiono qui quando il record viene modificato.",
  },
  loadError: "Impossibile caricare la cronologia. Riprova.",
  retry: "Riprova",
};
