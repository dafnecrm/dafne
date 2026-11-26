"use client";

import {
  HistoryIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  SquareIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AssistantAction,
  AssistantConversation,
  AssistantToolName,
  AvailableAssistantAgent,
  Json,
} from "@dafne/contracts";
import { Badge } from "@dafne/frontend-ui/components/badge";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dafne/frontend-ui/components/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@dafne/frontend-ui/components/drawer";
import { useIsMobile } from "@dafne/frontend-ui/hooks/use-mobile";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import { Textarea } from "@dafne/frontend-ui/components/textarea";
import {
  decideAction,
  deleteConversation,
  loadAssistant,
  openConversation,
  startConversation,
  switchModel,
} from "../actions.ts";
import { readEvents } from "../stream.ts";
import { ActionCard } from "./action-card.tsx";

type Agent = Json<AvailableAssistantAgent>;
type Conversation = Json<AssistantConversation>;
type Action = Json<AssistantAction>;

/** What the conversation shows, in order: messages and proposed actions. */
type Item =
  | { kind: "message"; key: string; role: "user" | "assistant"; text: string; tools: AssistantToolName[] }
  | { kind: "action"; key: string; action: Action };

const isError = (value: unknown): value is { error: string } =>
  typeof value === "object" && value !== null && "error" in value;

/**
 * The AI assistant: a button in the header (or ⌘J / Ctrl+J) opens a
 * drawer to talk to an agent. Answers stream in; writes come as cards to
 * confirm. `streamPath` is the app's route handler that relays a message.
 */
export function AssistantPanel({ streamPath }: { streamPath: (conversationId: number) => string }) {
  const t = useTranslations("assistantChat");
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerTrigger render={<Button variant="ghost" size="icon" aria-label={t("open")} title={`${t("open")} (⌘J)`} />}>
        <SparklesIcon />
      </DrawerTrigger>
      <DrawerContent className="data-[swipe-axis=x]:sm:w-xl data-[swipe-axis=y]:h-[calc(100dvh-6rem)]">
        {/* Mounted while open only: it loads the agents each time. */}
        {open && <AssistantChat streamPath={streamPath} />}
      </DrawerContent>
    </Drawer>
  );
}

function AssistantChat({ streamPath }: { streamPath: (conversationId: number) => string }) {
  const t = useTranslations("assistantChat");
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  /** Keys for the messages of this session's turns. */
  const turns = useRef(0);

  const agent = agents?.find((a) => a.id === agentId) ?? null;

  useEffect(() => {
    void loadAssistant().then((result) => {
      if (isError(result)) {
        setError(result.error);
        setAgents([]);
        return;
      }
      setAgents(result.agents);
      setConversations(result.conversations);
      const first = result.agents[0];
      if (first) {
        setAgentId(first.id);
        setModelId(first.defaultModelId ?? first.models[0]?.id ?? null);
      }
    });
    return () => abort.current?.abort();
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [items]);

  const pickAgent = (id: number) => {
    const next = agents?.find((a) => a.id === id);
    setAgentId(id);
    setModelId(next?.defaultModelId ?? next?.models[0]?.id ?? null);
  };

  const newConversation = () => {
    abort.current?.abort();
    setConversation(null);
    setItems([]);
    setError(null);
  };

  const showConversation = async (id: number) => {
    abort.current?.abort();
    const detail = await openConversation(id);
    if (isError(detail)) {
      setError(detail.error);
      return;
    }
    setError(null);
    setConversation(detail);
    setAgentId(detail.agentId);
    setModelId(detail.modelId);
    // Messages and actions, by time.
    const timeline: (Item & { at: string })[] = [
      ...detail.messages.map((m) => ({
        kind: "message" as const,
        key: `m${m.id}`,
        role: m.role,
        text: m.text,
        tools: m.tools,
        at: m.createdAt,
      })),
      ...detail.actions.map((a) => ({ kind: "action" as const, key: `a${a.id}`, action: a, at: a.createdAt })),
    ];
    timeline.sort((a, b) => a.at.localeCompare(b.at));
    setItems(timeline);
  };

  const removeConversation = async (id: number) => {
    const result = await deleteConversation(id);
    if (isError(result)) {
      setError(result.error);
      return;
    }
    setConversations((list) => list.filter((c) => c.id !== id));
    if (conversation?.id === id) {
      newConversation();
    }
  };

  const changeModel = async (id: number) => {
    setModelId(id);
    if (conversation) {
      const updated = await switchModel(conversation.id, id);
      if (isError(updated)) {
        setError(updated.error);
        setModelId(conversation.modelId);
        return;
      }
      setConversation(updated);
    }
  };

  /** Appends to the answer being written (the last item). */
  const updateAnswer = useCallback((change: (item: Extract<Item, { kind: "message" }>) => void) => {
    setItems((list) => {
      const index = list.findLastIndex((item) => item.kind === "message" && item.role === "assistant");
      if (index < 0) {
        return list;
      }
      const copy = { ...(list[index] as Extract<Item, { kind: "message" }>) };
      copy.tools = [...copy.tools];
      change(copy);
      return [...list.slice(0, index), copy, ...list.slice(index + 1)];
    });
  }, []);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy || !agentId) {
      return;
    }
    setError(null);
    setBusy(true);
    let current = conversation;
    if (!current) {
      const started = await startConversation(agentId, modelId);
      if (isError(started)) {
        setError(started.error);
        setBusy(false);
        return;
      }
      current = { ...started, title: trimmed.slice(0, 80) };
      setConversation(current);
      setConversations((list) => [current!, ...list]);
    }
    setText("");
    turns.current += 1;
    const stamp = turns.current;
    setItems((list) => [
      ...list,
      { kind: "message", key: `turn${stamp}-user`, role: "user", text: trimmed, tools: [] },
      { kind: "message", key: `turn${stamp}-answer`, role: "assistant", text: "", tools: [] },
    ]);

    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await fetch(streamPath(current.id), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t("error"));
      }
      await readEvents(res.body, (event) => {
        switch (event.type) {
          case "text":
            updateAnswer((item) => {
              item.text += event.delta;
            });
            break;
          case "tool":
            updateAnswer((item) => {
              item.tools.push(event.name);
            });
            break;
          case "action":
            setItems((list) => [...list, { kind: "action", key: `a${event.action.id}`, action: event.action }]);
            // The answer goes on below the card.
            setItems((list) => [...list, { kind: "message", key: `action${event.action.id}-answer`, role: "assistant", text: "", tools: [] }]);
            break;
          case "error":
            setError(event.message);
            break;
          case "done":
            break;
        }
      });
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : t("error"));
      }
    } finally {
      // Empty answers (e.g. right after a card) aren't shown.
      setItems((list) => list.filter((item) => item.kind !== "message" || item.role === "user" || item.text || item.tools.length));
      setBusy(false);
      abort.current = null;
    }
  };

  const decide = async (id: number, decision: "confirm" | "reject") => {
    const result = await decideAction(id, decision);
    if (isError(result)) {
      setError(result.error);
      return;
    }
    setItems((list) =>
      list.map((item) => (item.kind === "action" && item.action.id === id ? { ...item, action: result } : item)),
    );
    // The page behind may show what just changed.
    router.refresh();
  };

  if (agents === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader className="border-b pb-4">
        <DrawerTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4" />
          {conversation?.title ?? t("title")}
        </DrawerTitle>
        <DrawerDescription>{t("description")}</DrawerDescription>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {agents.length > 0 && (
            <Select
              items={agents.map((a) => ({ value: a.id, label: a.name }))}
              value={agentId}
              disabled={!!conversation}
              onValueChange={(value) => value !== null && pickAgent(value as number)}
            >
              <SelectTrigger size="sm" aria-label={t("agent")}>
                <SelectValue />
              </SelectTrigger>
              {/* Below the trigger, as wide as its items (labels, "local" badge). */}
              <SelectContent alignItemWithTrigger={false} align="start">
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {agent && agent.models.length > 0 && (
            <Select
              items={agent.models.map((m) => ({ value: m.id, label: m.label }))}
              value={modelId}
              disabled={busy || (!agent.allowModelOverride && !!conversation)}
              onValueChange={(value) => value !== null && changeModel(value as number)}
            >
              <SelectTrigger size="sm" aria-label={t("model")}>
                <SelectValue />
              </SelectTrigger>
              {/* Below the trigger, as wide as its items (labels, "local" badge). */}
              <SelectContent alignItemWithTrigger={false} align="start">
                {agent.models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                    {m.local && (
                      <Badge variant="secondary" className="ml-1">
                        {t("local")}
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("conversations")} />}>
                <HistoryIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {/* A label must be inside a group (Base UI's Menu.GroupLabel). */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("conversations")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {conversations.length === 0 && (
                    <DropdownMenuItem disabled>{t("noConversations")}</DropdownMenuItem>
                  )}
                  {conversations.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => void showConversation(c.id)} className="justify-between">
                      <span className="truncate">{c.title ?? t("untitled")}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("delete")}
                        onClick={(event) => {
                          event.stopPropagation();
                          void removeConversation(c.id);
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon-sm" aria-label={t("newConversation")} title={t("newConversation")} onClick={newConversation}>
              <PlusIcon />
            </Button>
          </div>
        </div>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {agents.length === 0 ? (
          <p className="text-muted-foreground">{error ?? t("noAgents")}</p>
        ) : items.length === 0 ? (
          <div className="grid gap-2">
            <p className="text-muted-foreground">{t("examples.title")}</p>
            {(["count", "create", "activity"] as const).map((example) => (
              <Button
                key={example}
                variant="outline"
                className="h-auto justify-start whitespace-normal text-left"
                onClick={() => void send(t(`examples.items.${example}`))}
              >
                {t(`examples.items.${example}`)}
              </Button>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) =>
              item.kind === "action" ? (
                <ActionCard key={item.key} action={item.action} onDecide={decide} />
              ) : item.role === "user" ? (
                <div key={item.key} className="ml-8 justify-self-end rounded-lg bg-primary px-3 py-2 whitespace-pre-wrap text-primary-foreground">
                  {item.text}
                </div>
              ) : (
                <div key={item.key} className="mr-8 grid gap-2">
                  {item.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(item.tools)].map((tool) => (
                        <Badge key={tool} variant="outline" className="text-muted-foreground">
                          <WrenchIcon />
                          {t(`tools.${tool}`)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.text ? (
                    <div className="whitespace-pre-wrap">{item.text}</div>
                  ) : (
                    busy && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Spinner /> {t("thinking")}
                      </span>
                    )
                  )}
                </div>
              ),
            )}
            <div ref={bottom} />
          </div>
        )}
        {error && agents.length > 0 && <p className="mt-4 text-destructive">{error}</p>}
      </div>

      {agents.length > 0 && (
        <form
          className="flex items-end gap-2 border-t p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(text);
          }}
        >
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send(text);
              }
            }}
            placeholder={t("placeholder")}
            maxLength={4000}
            rows={2}
            className="max-h-40 min-h-10 resize-none"
            aria-label={t("placeholder")}
          />
          {busy ? (
            <Button type="button" variant="outline" size="icon" aria-label={t("stop")} onClick={() => abort.current?.abort()}>
              <SquareIcon />
            </Button>
          ) : (
            <Button type="submit" size="icon" aria-label={t("send")} disabled={!text.trim()}>
              <SendIcon />
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
