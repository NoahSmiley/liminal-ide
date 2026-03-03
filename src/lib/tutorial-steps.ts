export interface TutorialStep {
  title: string;
  body: string;
  targetSelector?: string;
  hint?: string;
  ascii?: string;
}

export interface TutorialSection {
  name: string;
  steps: TutorialStep[];
}

export const TUTORIAL_SECTIONS_1_8: TutorialSection[] = [
  {
    name: "Welcome",
    steps: [
      {
        title: "Welcome to Liminal",
        body: "Liminal is an AI-first terminal IDE. You talk to Claude, and it writes code, runs commands, and manages your project.",
      },
      {
        title: "Opening a Project",
        body: "Use /new <name> to create a project or /open <path> to open an existing one. Recent projects appear on the welcome screen.",
      },
    ],
  },
  {
    name: "The Layout",
    steps: [
      {
        title: "Status Bar",
        body: "The top bar shows your project name, git branch, Claude availability, and quick toggles.",
        targetSelector: "[data-tutorial='status-bar']",
      },
      {
        title: "Panel Control Bar",
        body: "Switch between the chat view and the code editor. Toggle the terminal panel from here too.",
        targetSelector: "[data-tutorial='panel-control-bar']",
        hint: "try: Cmd+E to toggle views",
      },
      {
        title: "Input Bar",
        body: "Type messages to Claude, run /commands, or execute shell commands with the ! prefix.",
        targetSelector: "[data-tutorial='input-bar']",
      },
    ],
  },
  {
    name: "AI Conversation",
    steps: [
      {
        title: "Talking to the AI",
        body: "Just type a message and press Enter. Claude reads your project context and responds with code, explanations, or actions.",
        targetSelector: "[data-tutorial='conversation-stream']",
      },
      {
        title: "Tool Activity",
        body: "When Claude reads files, writes code, or runs commands, you'll see tool activity indicators inline in the conversation.",
        targetSelector: "[data-tutorial='conversation-stream']",
      },
      {
        title: "Streaming Responses",
        body: "Responses stream in real-time. The blinking cursor shows Claude is still generating. The input bar disables until the response completes.",
      },
      {
        title: "@ Mentions",
        body: "Type @ to reference files from your project in a message. This gives Claude targeted context about specific files.",
        targetSelector: "[data-tutorial='input-bar']",
        hint: "try: @filename in the input",
      },
      {
        title: "/summary & /review",
        body: "/summary asks Claude to analyze your whole project. /review performs an AI code review of the current file or recent changes.",
      },
    ],
  },
  {
    name: "Change Review",
    steps: [
      {
        title: "Snapshots",
        body: "Liminal takes snapshots of files before Claude modifies them, so you can always review or revert changes.",
      },
      {
        title: "Turn Review Bar",
        body: "After Claude makes changes, a review bar appears showing which files were modified. Accept or revert each turn.",
      },
      {
        title: "File-Level Diff",
        body: "Click a changed file in the review bar to see a line-by-line diff of what Claude changed.",
      },
      {
        title: "Live Preview",
        body: "While Claude streams code to a file, you can watch it appear in the editor in real-time.",
      },
    ],
  },
  {
    name: "File Tree & Editor",
    steps: [
      {
        title: "File Tree",
        body: "The sidebar shows your project's file structure. Click files to open them in the editor.",
        targetSelector: "[data-tutorial='file-tree-panel']",
        hint: "try: Cmd+B to toggle",
      },
      {
        title: "Context Menu",
        body: "Right-click files in the tree for options like pin to context, rename, or delete.",
        targetSelector: "[data-tutorial='file-tree-panel']",
      },
      {
        title: "Code Editor",
        body: "A full CodeMirror editor with syntax highlighting, language detection, and save with Cmd+S.",
        targetSelector: "[data-tutorial='editor-pane']",
      },
      {
        title: "Tabs",
        body: "Open multiple files at once. Tabs show a dirty indicator (*) when you have unsaved changes.",
        targetSelector: "[data-tutorial='tab-bar']",
      },
      {
        title: "LSP Integration",
        body: "The editor connects to language servers for autocompletion, diagnostics, and hover info.",
        targetSelector: "[data-tutorial='code-editor']",
      },
      {
        title: "Undo / Redo",
        body: "The editor toolbar provides undo/redo buttons plus cursor position and language info.",
        targetSelector: "[data-tutorial='editor-toolbar']",
        hint: "try: Cmd+Z / Cmd+Shift+Z",
      },
    ],
  },
  {
    name: "Terminal",
    steps: [
      {
        title: "Built-in Terminal",
        body: "A terminal panel shows output from commands Claude runs or that you execute yourself.",
        targetSelector: "[data-tutorial='terminal-panel']",
        hint: "try: Cmd+J to toggle",
      },
      {
        title: "! Prefix",
        body: "Type !command in the input bar to run a shell command directly. Output appears in the terminal panel.",
        targetSelector: "[data-tutorial='input-bar']",
        hint: "try: !ls -la",
      },
      {
        title: "!! Prefix",
        body: "Type !!query to describe a command in natural language. Liminal translates it to a shell command and runs it.",
        targetSelector: "[data-tutorial='input-bar']",
        hint: "try: !!show disk usage",
      },
      {
        title: "Error Interpretation",
        body: "When a command fails, Liminal offers to have Claude interpret the error and suggest a fix.",
        targetSelector: "[data-tutorial='terminal-panel']",
      },
    ],
  },
  {
    name: "Pinned Context",
    steps: [
      {
        title: "What Pinning Does",
        body: "Pinned items are included as context in every message you send to Claude, so it always has the right background.",
        targetSelector: "[data-tutorial='pinned-chips']",
      },
      {
        title: "Pinning Files",
        body: "Pin files from the file tree context menu or with @ mentions. Pinned files show as chips above the input bar.",
        targetSelector: "[data-tutorial='pinned-chips']",
      },
      {
        title: "Pinning Text",
        body: "Pin terminal output or selected text as context. Click the 'x' on any chip to unpin it.",
        targetSelector: "[data-tutorial='pinned-chips']",
      },
    ],
  },
  {
    name: "Search",
    steps: [
      {
        title: "Project-Wide Search",
        body: "Search across all files in your project. Click a result to jump to that file and line.",
        targetSelector: "[data-tutorial='search-panel']",
        hint: "try: Cmd+Shift+F",
      },
      {
        title: "Regex & Case Options",
        body: "Toggle case sensitivity with 'Aa' and regex mode with '.*' for powerful pattern matching.",
        targetSelector: "[data-tutorial='search-panel']",
      },
    ],
  },
];
