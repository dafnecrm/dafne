[← Index](README.md)

# The AI assistant

Users of the sales app can ask in plain language: "quanti ordini aperti ha
il cliente Rossi Srl?", "crea il cliente Rossi Srl". A side panel
(`@dafne/frontend-assistant`, ⌘J) talks to the API
(`@dafne/backend-assistant`, `/assistant/*`), which runs the model and its
tools.

```
sales-web panel ─SSE─> route handler (/api/assistant/:id/messages) ─cookie─> sales-api /assistant
                                                                               │
                                       ChatService ── ModelFactory(provider, model) ── streamText(tools)
                                                                               │
                                     CustomersService · SalesOrdersService · ActivitiesService · ProductsService
```

## Providers, models, agents

The loop runs in our API with the [AI SDK](https://ai-sdk.dev) (`ai`), so
the provider is a setting, not code:

| Kind (`assistant_provider.kind`) | Adapter                      | For                                   |
| -------------------------------- | ---------------------------- | ------------------------------------- |
| `anthropic`                      | `@ai-sdk/anthropic`          | Claude                                |
| `openai`                         | `@ai-sdk/openai`             | OpenAI                                |
| `openai-compatible`              | `@ai-sdk/openai-compatible`  | Ollama, LM Studio, vLLM (`baseUrl`)   |

- A **provider** names the env var of sales-api holding its key
  (`apiKeyEnv`, e.g. `ANTHROPIC_API_KEY`): keys never go in the database.
  "Test connection" (`POST /assistant-providers/:id/check`) lists its models.
- A **model** is a provider's model id plus options: `reasoning`
  (`none`…`max`, mapped by the AI SDK for each provider) and `temperature`.
  Only enabled models with `supportsTools` are offered.
- An **agent** is what users pick: instructions (added to the fixed rules
  in `chat/system-prompt.ts`), its tools, a default model, and whether
  users may switch model.

All three are CRUD resources managed by **super-admins** only
(`@SuperAdmin()`; pages at `/admin/assistant-*`, under
`app/[locale]/(app)/(admin)/admin/(super-admin)`). The
first migration seeds an Anthropic provider, a local Ollama with
`qwen3:8b`, and the "Assistente vendite" agent, all disabled.

## Who can use an agent

An agent's **audience** is `everyone` (every user of the sales app) or
`groups`: only the members of the [user groups](architecture.md#user-groups)
it lists (`assistant_agent_group`). Super-admins can use every agent anyway,
to set them up and try them; admins follow the audience like everyone else.

One rule, `canUse()` in `chat/conversations.service.ts`, decides it
everywhere: the agents a user is offered (`GET /assistant/agents`),
starting a conversation, sending a message, switching model, confirming
an action. A user taken out of a group keeps their old conversations
(readable, deletable), but gets 403 `assistant.agent.unavailable` when
writing to them.

## Tools and confirmations

The tools (`src/tools`) call the CRM services directly, the way the
controllers do:

- **Reads** (`search_customers`, `list_sales_orders`…) run at once and answer
  compact JSON, at most 20 rows, with `total` for counts.
- **Writes** (`propose_*`) never write: they validate with the contract's
  schema and save a pending `assistant_action`. The panel shows it as a
  card; **Confirm** (`POST /assistant/actions/:id/confirm`) runs it as the
  user, through the service, so hooks, change log and state machine guards
  apply. Either way the model gets an app note with the outcome.
- Tools for small models take what the user said, not ids, when they can:
  `propose_create_sales_order` finds the customer and the products by name
  (asking back when several match) and picks the only active order type.
- If a turn ends with no text (small models sometimes stop after their
  tools), the model gets one more call, tools off, to answer in words; if it
  still says nothing the user sees `assistant.noAnswer`.
- A tool must never reach what a controller keeps from the sales app's
  users (`@Roles(...)`): everyone who can chat can call every tool of their
  agent. That's why there's no users tool.

## Conversations

`assistant_conversation`, `assistant_message` and `assistant_action` (sales
schema) belong to one user. Messages are stored append-only in the AI
SDK's provider-neutral format (`ModelMessage`), so a conversation can move
to another model. A user may send `ASSISTANT_RATE_LIMIT` messages (default
30) every 10 minutes; each answer has at most 8 model calls.

## Local models (Ollama)

```sh
ollama pull qwen3:8b
OLLAMA_CONTEXT_LENGTH=16384 ollama serve
```

Then enable the "Ollama (locale)" provider and its model. Notes:

- Ollama's OpenAI-compatible API ignores `num_ctx`: set the context with
  `OLLAMA_CONTEXT_LENGTH` (or a Modelfile).
- Use models with tool calling (qwen3, llama3.1+, gemma4…), and try
  reasoning `none`: far faster on a laptop.
- About 12 GB of free memory: `qwen3:8b`; less: `qwen3:4b`.

## Comparing models

`eval/assistant.eval.ts` asks fixed CRM requests (counting a customer's
open orders, proposing a customer, an ambiguous name…) to a real model,
over a CRM faked in memory, and checks the tools it called. Not in CI.

```sh
EVAL_MODEL=qwen3:8b EVAL_REASONING=none pnpm nx eval @dafne/backend-assistant
EVAL_KIND=anthropic EVAL_MODEL=claude-opus-5-5 EVAL_REASONING=low pnpm nx eval @dafne/backend-assistant
```

## Adding a tool

1. Add its name to `ASSISTANT_READ_TOOLS` or `ASSISTANT_WRITE_TOOLS`
   (`packages/contracts/src/assistant.ts`).
2. Write it in `src/tools/read-tools.ts`, or, for a write, `prepare` and
   `run` in `src/tools/write-tools.ts` (inject the service in
   `AssistantTools`, and its module in `AssistantModule`).
3. Add its labels to the frontend's messages (`assistantAgents.tools`,
   `assistantChat.tools`, and for writes `assistantChat.action.title`).
4. Turn it on in the agents that should have it.

## See also

- [Architecture](architecture.md)
- [Databases and migrations](databases.md)
