const SUBAGENT_TOOLS = new Set(["Agent", "Task", "Skill"]);

export function isSubagentTool(toolName: string): boolean {
  return SUBAGENT_TOOLS.has(toolName);
}

export function parseSubagentDescription(input: string): string {
  try {
    const parsed = JSON.parse(input);
    if (parsed.description) return parsed.description;
    if (parsed.prompt) return parsed.prompt.slice(0, 80);
    if (parsed.skill) return parsed.skill;
    return parsed.subagent_type ?? "subagent";
  } catch {
    return input.slice(0, 60) || "subagent";
  }
}
