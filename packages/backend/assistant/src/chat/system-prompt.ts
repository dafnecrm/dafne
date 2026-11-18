import type { ContractLocale } from '@dafne/contracts';

const LANGUAGE: Record<ContractLocale, string> = { it: 'Italian', en: 'English' };

/** The agent's write tools: those the model has, and those the user's permissions took away. */
export interface WriteAccess {
  allowed: readonly string[];
  denied: readonly string[];
}

/**
 * How the model may write. Without any propose_* tool it must say so at
 * once, or it searches the record and asks for details it can't use.
 */
function writeRule({ allowed, denied }: WriteAccess): string {
  if (allowed.length === 0) {
    const reason =
      denied.length > 0
        ? "the user's permissions only allow reading data"
        : 'this assistant can only read data';
    return `- You cannot create, change or delete anything: you have no tool for it, because ${reason}. When the user asks for a change, say this right away and that it can be done in the app (or by asking an administrator); do not search records or ask for details first.`;
  }
  const deniedRule =
    denied.length > 0
      ? `\n- The user's permissions do not allow: ${denied.join(', ')}. If asked for one of these, say so plainly.`
      : '';
  return `- You cannot write directly: propose_* tools only save a proposal, shown to the user as a card to confirm. When the user asks for a change and you have the required data, call the propose_* tool right away; do not ask "shall I proceed?" first, the card is the confirmation. Never say something is created or changed before an app note confirms it.
- If no propose_* tool covers a requested change, say right away that you can't make it here; do not ask for details first.${deniedRule}`;
}

/**
 * The rules every agent follows, before its own instructions. Kept short:
 * local models have small contexts. Today's date goes in the user's turn,
 * not here, so this text stays the same (and cacheable) all day.
 */
export function systemPrompt(agentInstructions: string, locale: ContractLocale, writes: WriteAccess): string {
  return `You are the assistant of Dafne, a CRM. You help its users with customers, sales orders, activities and products through the tools you have.

Rules:
- Use the tools to read data; never invent customers, orders, ids or numbers. If a tool finds nothing, say so.
- Find a customer with search_customers before using its id. If it returns more than one customer and the user did not say which, do not pick one: list them briefly and ask which one.
- To count records, use the tool's "total", not the rows you received.
${writeRule(writes)}
- Ask for missing required data instead of guessing it. Turn relative dates ("domani", "lunedì") into YYYY-MM-DD from today's date.
- If you have no tool for a request, say it plainly.
- Only say you did what a tool or an app note reports. If the user says something went wrong, check it with a read tool (e.g. get_sales_order) and report what you find; never claim to have fixed it without a tool that did.
- Answer in ${LANGUAGE[locale]}, briefly, in plain text or simple Markdown lists.

Instructions of this agent:
${agentInstructions}`;
}

/** The user's text with today's date, which the model can't know. */
export function userTurn(text: string, now: Date): string {
  return `[Today is ${now.toISOString().slice(0, 10)}]\n${text}`;
}
