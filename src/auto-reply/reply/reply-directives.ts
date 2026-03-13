import { splitMediaFromOutput } from "../../media/parse.js";
import { parseInlineDirectives } from "../../utils/directive-tags.js";
import { isSilentReplyText, SILENT_REPLY_TOKEN } from "../tokens.js";

export type ReplyDirectiveParseResult = {
  text: string;
  mediaUrls?: string[];
  mediaUrl?: string;
  replyToId?: string;
  replyToCurrent: boolean;
  replyToTag: boolean;
  audioAsVoice?: boolean;
  isSilent: boolean;
};

export function parseReplyDirectives(
  raw: string,
  options: { currentMessageId?: string; silentToken?: string } = {},
): ReplyDirectiveParseResult {
  const split = splitMediaFromOutput(raw);
  const hasExplicitMedia = Boolean(
    split.mediaUrl || (split.mediaUrls && split.mediaUrls.length > 0),
  );
  let text = split.text ?? "";

  const replyParsed = parseInlineDirectives(text, {
    currentMessageId: options.currentMessageId,
    stripAudioTag: false,
    stripReplyTags: true,
  });

  if (replyParsed.hasReplyTag) {
    text = replyParsed.text;
  }

  const silentToken = options.silentToken ?? SILENT_REPLY_TOKEN;
  const isSilent = isSilentReplyText(text, silentToken);
  if (isSilent) {
    text = "";
  }

  const inferredMediaUrl = !hasExplicitMedia ? inferSingleMediaUrl(text) : undefined;
  // Preserve visible text for auto-inferred media so path/url-only responses
  // still have a textual fallback if media path normalization later fails.

  return {
    text,
    mediaUrls: split.mediaUrls,
    mediaUrl: split.mediaUrl ?? inferredMediaUrl,
    replyToId: replyParsed.replyToId,
    replyToCurrent: replyParsed.replyToCurrent,
    replyToTag: replyParsed.hasReplyTag,
    audioAsVoice: split.audioAsVoice,
    isSilent,
  };
}

function inferSingleMediaUrl(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.includes("\n")) {
    return undefined;
  }
  // Reuse MEDIA parsing semantics so plain `path` / `url` inputs and explicit
  // `MEDIA:<source>` follow exactly the same extraction behavior.
  const reparsed = splitMediaFromOutput(`MEDIA:${trimmed}`);
  const inferred = reparsed.mediaUrl?.trim();
  if (!inferred || reparsed.text.trim().length > 0) {
    return undefined;
  }
  return inferred;
}
