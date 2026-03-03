import { describe, expect, it } from "vitest";
import { parseContent } from "./parse-content";

describe("parseContent", () => {
  it("returns plain text as single part", () => {
    const parts = parseContent("hello world");
    expect(parts).toEqual([{ type: "text", text: "hello world" }]);
  });

  it("extracts a single code block", () => {
    const parts = parseContent("```ts\nconst x = 1;\n```");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual({
      type: "code",
      code: "const x = 1;",
      language: "ts",
    });
  });

  it("handles text before and after code", () => {
    const raw = "before\n```py\nprint(1)\n```\nafter";
    const parts = parseContent(raw);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ type: "text", text: "before" });
    expect(parts[1]).toEqual({ type: "code", code: "print(1)", language: "py" });
    expect(parts[2]).toEqual({ type: "text", text: "after" });
  });

  it("handles multiple code blocks", () => {
    const raw = "```js\na\n```\ntext\n```rs\nb\n```";
    const parts = parseContent(raw);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ type: "code", code: "a", language: "js" });
    expect(parts[1]).toEqual({ type: "text", text: "text" });
    expect(parts[2]).toEqual({ type: "code", code: "b", language: "rs" });
  });

  it("handles code block without language", () => {
    const parts = parseContent("```\nhello\n```");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual({ type: "code", code: "hello", language: undefined });
  });

  it("returns empty array for empty input", () => {
    const parts = parseContent("");
    expect(parts).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    const parts = parseContent("   ");
    expect(parts).toEqual([]);
  });
});
