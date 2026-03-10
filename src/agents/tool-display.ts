import SHARED_TOOL_DISPLAY_JSON from "../../apps/shared/OpenClawKit/Sources/OpenClawKit/Resources/tool-display.json" with { type: "json" };
import { redactToolDetail } from "../logging/redact.js";
import { shortenHomeInString } from "../utils.js";
import {
  defaultTitle,
  formatToolDetailText,
  formatDetailKey,
  normalizeToolName,
  resolveToolVerbAndDetailForArgs,
  type ToolDisplaySpec as ToolDisplaySpecBase,
} from "./tool-display-common.js";
import TOOL_DISPLAY_OVERRIDES_JSON from "./tool-display-overrides.json" with { type: "json" };

type ToolDisplaySpec = ToolDisplaySpecBase & {
  emoji?: string;
};

type ToolDisplayConfig = {
  version?: number;
  fallback?: ToolDisplaySpec;
  tools?: Record<string, ToolDisplaySpec>;
};

export type ToolDisplay = {
  name: string;
  emoji: string;
  title: string;
  label: string;
  verb?: string;
  detail?: string;
};

const SHARED_TOOL_DISPLAY_CONFIG = SHARED_TOOL_DISPLAY_JSON as ToolDisplayConfig;
const TOOL_DISPLAY_OVERRIDES = TOOL_DISPLAY_OVERRIDES_JSON as ToolDisplayConfig;
const FALLBACK = TOOL_DISPLAY_OVERRIDES.fallback ??
  SHARED_TOOL_DISPLAY_CONFIG.fallback ?? { emoji: "🧩" };
const TOOL_MAP = Object.assign({}, SHARED_TOOL_DISPLAY_CONFIG.tools, TOOL_DISPLAY_OVERRIDES.tools);
const DETAIL_LABEL_OVERRIDES: Record<string, string> = {
  agentId: "agent",
  sessionKey: "session",
  targetId: "target",
  targetUrl: "url",
  nodeId: "node",
  requestId: "request",
  messageId: "message",
  threadId: "thread",
  channelId: "channel",
  guildId: "guild",
  userId: "user",
  runTimeoutSeconds: "timeout",
  timeoutSeconds: "timeout",
  includeTools: "tools",
  pollQuestion: "poll",
  maxChars: "max chars",
};
const MAX_DETAIL_ENTRIES = 8;

function normalizeActionForTitle(action: string | undefined): string | undefined {
  const trimmed = action?.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.replace(/[_-]+/g, " ").replace(/\./g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  return defaultTitle(normalized);
}

function resolveProcessTitleAction(args: unknown): string | undefined {
  if (!args || typeof args !== "object") {
    return undefined;
  }

  const record = args as Record<string, unknown>;
  const actionRaw = typeof record.action === "string" ? record.action.trim() : "";
  if (!actionRaw) {
    return undefined;
  }

  if (actionRaw !== "write") {
    return normalizeActionForTitle(actionRaw);
  }

  const dataRaw = typeof record.data === "string" ? record.data.trim() : "";
  if (!dataRaw) {
    return normalizeActionForTitle(actionRaw);
  }

  try {
    const parsed = JSON.parse(dataRaw) as unknown;
    if (parsed && typeof parsed === "object") {
      const innerAction = (parsed as Record<string, unknown>).action;
      if (typeof innerAction === "string" && innerAction.trim()) {
        return normalizeActionForTitle(innerAction);
      }
    }
  } catch {
    // Ignore malformed JSON and fall back to the outer action.
  }

  return normalizeActionForTitle(actionRaw);
}

function resolveToolTitle(params: {
  key: string;
  name: string;
  spec?: ToolDisplaySpec;
  args?: unknown;
}): string {
  const baseTitle = params.spec?.title ?? defaultTitle(params.name);
  if (params.key !== "process") {
    return baseTitle;
  }
  const processActionTitle = resolveProcessTitleAction(params.args);
  if (!processActionTitle) {
    return baseTitle;
  }
  return `${baseTitle} ${processActionTitle}`;
}

export function resolveToolDisplay(params: {
  name?: string;
  args?: unknown;
  meta?: string;
}): ToolDisplay {
  const name = normalizeToolName(params.name);
  const key = name.toLowerCase();
  const spec = TOOL_MAP[key];
  const emoji = spec?.emoji ?? FALLBACK.emoji ?? "🧩";
  const title = resolveToolTitle({ key, name, spec, args: params.args });
  const label = spec?.label ?? title;
  let { verb, detail } = resolveToolVerbAndDetailForArgs({
    toolKey: key,
    args: params.args,
    meta: params.meta,
    spec,
    fallbackDetailKeys: FALLBACK.detailKeys,
    detailMode: "summary",
    detailMaxEntries: MAX_DETAIL_ENTRIES,
    detailFormatKey: (raw) => formatDetailKey(raw, DETAIL_LABEL_OVERRIDES),
  });

  if (detail) {
    detail = shortenHomeInString(detail);
  }

  return {
    name,
    emoji,
    title,
    label,
    verb,
    detail,
  };
}

export function formatToolDetail(display: ToolDisplay): string | undefined {
  const detailRaw = display.detail ? redactToolDetail(display.detail) : undefined;
  return formatToolDetailText(detailRaw);
}

export function formatToolSummary(display: ToolDisplay): string {
  const detail = formatToolDetail(display);
  return detail
    ? `${display.emoji} ${display.label}: ${detail}`
    : `${display.emoji} ${display.label}`;
}
