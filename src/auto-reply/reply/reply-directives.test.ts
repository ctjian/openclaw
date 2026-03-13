import { describe, expect, it } from "vitest";
import { parseReplyDirectives } from "./reply-directives.js";

describe("parseReplyDirectives media inference", () => {
  it("infers a local absolute path as media", () => {
    const parsed = parseReplyDirectives("/tmp/generated.png");
    expect(parsed.mediaUrl).toBe("/tmp/generated.png");
    expect(parsed.text).toBe("/tmp/generated.png");
  });

  it("infers an https URL with query params as media", () => {
    const parsed = parseReplyDirectives("https://example.com/image?sig=123");
    expect(parsed.mediaUrl).toBe("https://example.com/image?sig=123");
    expect(parsed.text).toBe("https://example.com/image?sig=123");
  });

  it("does not infer media from multiline text", () => {
    const parsed = parseReplyDirectives("line 1\n/tmp/generated.png");
    expect(parsed.mediaUrl).toBeUndefined();
    expect(parsed.text).toBe("line 1\n/tmp/generated.png");
  });

  it("keeps normal prose unchanged", () => {
    const parsed = parseReplyDirectives("This is not a media path.");
    expect(parsed.mediaUrl).toBeUndefined();
    expect(parsed.text).toBe("This is not a media path.");
  });
});
