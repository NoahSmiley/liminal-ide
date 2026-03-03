/**
 * Extract clickable quick-reply suggestions from an assistant message.
 * Looks for: quoted phrases ("keep it simple"), and "Or just say X" patterns.
 */
export function extractQuickReplies(content: string): string[] {
  const replies: string[] = [];
  const seen = new Set<string>();

  const add = (text: string) => {
    const t = text.trim();
    if (t.length < 2 || t.length > 60 || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    replies.push(t);
  };

  // Quoted suggestions: "keep it simple", "just do it"
  const quoted = content.matchAll(/"([^"]{2,50})"/g);
  for (const m of quoted) add(m[1]!);

  // "Or just say X" / "or say X" patterns
  const orSay = content.match(/or (?:just )?say\s+"?([^"\n.]{2,50})"?/i);
  if (orSay) add(orSay[1]!);

  return replies.slice(0, 4);
}
