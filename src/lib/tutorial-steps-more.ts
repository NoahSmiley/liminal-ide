import type { TutorialSection } from "./tutorial-steps";

export const TUTORIAL_SECTIONS_9_16: TutorialSection[] = [
  {
    name: "Git",
    steps: [
      {
        title: "Git Panel",
        body: "The git panel shows status, commit history, and diffs. Switch between tabs to explore your repo state.",
        targetSelector: "[data-tutorial='git-panel']",
      },
      {
        title: "Branch Display",
        body: "The current branch and ahead/behind counts show in the status bar and git panel header.",
        targetSelector: "[data-tutorial='status-bar']",
      },
      {
        title: "Git Slash Commands",
        body: "Use /status, /diff, and /log to ask Claude to run git commands and show results in the conversation.",
      },
      {
        title: "/commit",
        body: "Type /commit [msg] to commit staged changes. Without a message, Claude writes one based on the diff.",
        hint: "try: /commit",
      },
      {
        title: "/pr",
        body: "Type /pr [description] to have Claude create a pull request for the current branch.",
        hint: "try: /pr",
      },
    ],
  },
  {
    name: "TODO Tracker",
    steps: [
      {
        title: "Scanning TODOs",
        body: "The TODO panel scans your codebase for TODO, FIXME, HACK, and XXX comments, grouped by file.",
        targetSelector: "[data-tutorial='todo-panel']",
      },
      {
        title: "Fix with AI",
        body: "Click 'fix' on any TODO item to have Claude attempt to resolve it automatically.",
        targetSelector: "[data-tutorial='todo-panel']",
      },
    ],
  },
  {
    name: "Snippet Library",
    steps: [
      {
        title: "What Snippets Are",
        body: "Snippets are reusable code blocks you save for quick insertion into conversations or files.",
        targetSelector: "[data-tutorial='snippet-panel']",
      },
      {
        title: "Saving Snippets",
        body: "Click '+ new' in the snippet panel to save a titled code block for later use.",
        targetSelector: "[data-tutorial='snippet-panel']",
      },
      {
        title: "Inserting Snippets",
        body: "Click a saved snippet to insert its content. Useful for boilerplate, templates, and common patterns.",
        targetSelector: "[data-tutorial='snippet-panel']",
      },
    ],
  },
  {
    name: "Plugin System",
    steps: [
      {
        title: "What Plugins Are",
        body: "Plugins extend Liminal with custom commands. They are defined by JSON manifests in your project.",
        targetSelector: "[data-tutorial='plugin-panel']",
      },
      {
        title: "Plugin Manifests",
        body: "Each plugin declares a name, version, description, and a list of commands it provides.",
        targetSelector: "[data-tutorial='plugin-panel']",
      },
      {
        title: "Running Commands",
        body: "Click a plugin command to execute it. Output appears inline in the plugin panel.",
        targetSelector: "[data-tutorial='plugin-panel']",
      },
    ],
  },
  {
    name: "Debugger",
    steps: [
      {
        title: "Debugger Overview",
        body: "The built-in debugger lets you set breakpoints, step through code, and inspect variables.",
      },
      {
        title: "Breakpoints",
        body: "Click the gutter in the editor to set breakpoints. They persist across sessions.",
      },
      {
        title: "Step Controls",
        body: "Use the debug toolbar to step over, step into, step out, continue, or stop execution.",
      },
      {
        title: "Variables & Call Stack",
        body: "Inspect local variables and navigate the call stack when paused at a breakpoint.",
      },
    ],
  },
  {
    name: "Collaboration",
    steps: [
      {
        title: "Sharing a Session",
        body: "Click 'share' in the status bar to create a collaborative room. Share the room ID with others.",
        targetSelector: "[data-tutorial='collab-indicator']",
      },
      {
        title: "Remote Cursors",
        body: "See other participants' cursors in real-time as they navigate and edit files.",
      },
      {
        title: "Leaving a Session",
        body: "Click 'leave' in the status bar to disconnect from the collaborative session.",
        targetSelector: "[data-tutorial='collab-indicator']",
      },
    ],
  },
  {
    name: "Settings",
    steps: [
      {
        title: "Opening Settings",
        body: "Click the '*' button in the status bar or use Cmd+, to open the settings panel.",
        targetSelector: "[data-tutorial='settings-panel']",
        hint: "try: Cmd+,",
      },
      {
        title: "Model, Theme & Font",
        body: "Choose your AI model, color theme, font size, and keybinding preset.",
        targetSelector: "[data-tutorial='settings-panel']",
      },
      {
        title: "Reset Defaults",
        body: "The 'reset defaults' button at the bottom restores all settings to their original values.",
        targetSelector: "[data-tutorial='settings-panel']",
      },
    ],
  },
  {
    name: "Keyboard Reference",
    steps: [
      {
        title: "Keyboard Shortcuts",
        body: "Liminal is keyboard-first. Here are the essential shortcuts.",
        ascii: [
          "Cmd+B      toggle file tree",
          "Cmd+J      toggle terminal",
          "Cmd+E      toggle chat/editor",
          "Cmd+S      save current file",
          "Cmd+,      open settings",
          "Cmd+Shift+F  project search",
          "Cmd+R      refresh file tree",
          "Cmd+W      close active file",
          "Up/Down    input history",
          "Escape     close panel / tutorial",
        ].join("\n"),
      },
    ],
  },
];
