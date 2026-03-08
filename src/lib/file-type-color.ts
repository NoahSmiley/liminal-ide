const EXT_COLORS: Record<string, string> = {
  ts: "bg-sky-400",
  tsx: "bg-sky-400",
  js: "bg-amber-400",
  jsx: "bg-amber-400",
  json: "bg-yellow-500",
  rs: "bg-orange-400",
  py: "bg-green-400",
  go: "bg-cyan-400",
  md: "bg-zinc-400",
  mdx: "bg-zinc-400",
  css: "bg-purple-400",
  scss: "bg-purple-400",
  html: "bg-red-400",
  svg: "bg-orange-300",
  toml: "bg-zinc-500",
  yaml: "bg-pink-400",
  yml: "bg-pink-400",
  sh: "bg-green-500",
  sql: "bg-blue-400",
  swift: "bg-orange-500",
  kt: "bg-violet-400",
  java: "bg-red-500",
  c: "bg-blue-500",
  cpp: "bg-blue-500",
  h: "bg-blue-300",
  rb: "bg-red-400",
  lock: "bg-zinc-700",
  gitignore: "bg-zinc-700",
};

export function fileTypeDotColor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_COLORS[ext] ?? "bg-zinc-700";
}
