import type { TasksMessages } from "./en.ts";

/** Testi delle attività pianificate in italiano: le stesse chiavi di en.ts. */
export const it: TasksMessages = {
  all: "Tutte le attività",
  description: "Lavori che l'app esegue secondo una pianificazione, o quando vengono avviati. Una sola esecuzione per attività alla volta.",
  empty: "Ancora nessuna attività.",
  fields: {
    cron: "Espressione cron",
    defaultCron: "Pianificazione predefinita",
    enabled: "Attiva",
    lastRun: "Ultima esecuzione",
    nextRunAt: "Prossima esecuzione",
    schedule: "Pianificazione",
    task: "Attività",
    timeoutSeconds: "Tempo massimo (secondi)",
    timezone: "Fuso orario",
  },
  hints: {
    cron: "minuto ora giorno mese giorno-settimana, es. 0 3 * * * (ogni giorno alle 3:00), */15 * * * * (ogni 15 minuti). Vuota: parte solo quando viene avviata.",
    customized: "Modificata da un amministratore: i valori predefiniti del codice non valgono più.",
    enabled: "Disattivata: niente esecuzioni pianificate, e le altre app non possono avviarla. Gli amministratori sì.",
    timeoutSeconds: "Un'esecuzione che dura di più fallisce. Vuoto: nessun limite.",
  },
  manualOnly: "Solo se avviata",
  names: {
    quotations: {
      expiry: {
        description: "Assegna lo stato expired alle offerte non più valide.",
        name: "Scadenza offerte"
      }
    },
    tasks: {
      cleanup: {
        description: "Elimina le esecuzioni vecchie e chiude come fallite quelle interrotte quando l'app delle attività si è fermata.",
        name: "Pulizia delle esecuzioni",
      },
    }
  },
  never: "Mai eseguita",
  off: "Disattivata",
  reset: "Ripristina predefiniti",
  runNow: "Esegui ora",
  runs: {
    all: "Tutte",
    empty: "Nessuna esecuzione.",
    fields: {
      duration: "Durata",
      error: "Errore",
      errorStack: "Stack trace",
      finishedAt: "Terminata",
      id: "Esecuzione",
      payload: "Input",
      queuedAt: "In coda dal",
      result: "Risultato",
      source: "App",
      startedAt: "Iniziata",
      status: "Stato",
      trigger: "Avviata da",
    },
    logs: "Log",
    next: "Successive",
    noLogs: "Nessun messaggio.",
    page: "{from}–{to} di {total}",
    previous: "Precedenti",
    run: "Esecuzione {id}",
    title: "Esecuzioni",
  },
  save: "Salva impostazioni",
  saved: "Impostazioni salvate.",
  settings: "Impostazioni",
  status: {
    failed: "Fallita",
    queued: "In coda",
    running: "In esecuzione",
    skipped: "Saltata",
    succeeded: "Riuscita",
  },
  title: "Attività pianificate",
  trigger: {
    api: "Un'altra app",
    manual: "Amministratore",
    schedule: "Pianificazione",
  },
};
