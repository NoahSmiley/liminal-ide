import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const liminalEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "#050507",
    color: "#d4d4d8",
    fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "12px",
    lineHeight: "1.4",
  },
  ".cm-content": { caretColor: "#22d3ee", padding: "8px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#22d3ee" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#27272a",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-gutters": {
    backgroundColor: "#050507",
    color: "#3f3f46",
    border: "none",
    minWidth: "3ch",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#52525b" },
  ".cm-lineNumbers .cm-gutterElement": {
    paddingLeft: "8px",
    paddingRight: "12px",
  },
  ".cm-foldPlaceholder": { backgroundColor: "#27272a", border: "none", color: "#71717a" },
  ".cm-tooltip": { backgroundColor: "#0e0e12", border: "1px solid #222228", color: "#d4d4d8" },
  ".cm-tooltip-autocomplete": { "& > ul > li[aria-selected]": { backgroundColor: "#222228" } },
  ".cm-panels": { backgroundColor: "#0a0a0d", borderColor: "#222228" },
  ".cm-searchMatch": { backgroundColor: "#422006", outline: "1px solid #78350f" },
  ".cm-selectionMatch": { backgroundColor: "#1c1917" },
}, { dark: true });

const liminalHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#a78bfa" },
  { tag: tags.controlKeyword, color: "#a78bfa" },
  { tag: tags.operatorKeyword, color: "#a78bfa" },
  { tag: tags.definitionKeyword, color: "#a78bfa" },
  { tag: tags.moduleKeyword, color: "#a78bfa" },
  { tag: tags.operator, color: "#a1a1aa" },
  { tag: tags.string, color: "#22d3ee" },
  { tag: tags.regexp, color: "#22d3ee" },
  { tag: tags.comment, color: "#52525b", fontStyle: "italic" },
  { tag: tags.lineComment, color: "#52525b", fontStyle: "italic" },
  { tag: tags.blockComment, color: "#52525b", fontStyle: "italic" },
  { tag: tags.number, color: "#f59e0b" },
  { tag: tags.bool, color: "#f59e0b" },
  { tag: tags.null, color: "#f59e0b" },
  { tag: tags.function(tags.variableName), color: "#22d3ee" },
  { tag: tags.function(tags.definition(tags.variableName)), color: "#22d3ee" },
  { tag: tags.typeName, color: "#a78bfa" },
  { tag: tags.className, color: "#a78bfa" },
  { tag: tags.definition(tags.typeName), color: "#a78bfa" },
  { tag: tags.propertyName, color: "#d4d4d8" },
  { tag: tags.definition(tags.variableName), color: "#d4d4d8" },
  { tag: tags.variableName, color: "#d4d4d8" },
  { tag: tags.tagName, color: "#22d3ee" },
  { tag: tags.attributeName, color: "#a78bfa" },
  { tag: tags.meta, color: "#71717a" },
  { tag: tags.punctuation, color: "#71717a" },
]);

export const liminalTheme = [liminalEditorTheme, syntaxHighlighting(liminalHighlightStyle)];
