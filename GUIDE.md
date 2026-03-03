# Liminal User Guide

A practical walkthrough of how to use Liminal as your daily IDE.

## Getting Started

### First Launch

When you open Liminal, you see a welcome screen. Start by opening a project:

```
/open ~/projects/my-app
```

Liminal will:
1. Index the project directory
2. Create a conversation session
3. Open the file tree sidebar
4. Generate an AI summary of the project structure

You can also create a fresh project:
```
/new my-new-app
```

### The Interface

```
┌─────────────────────────────────────────────────────┐
│ ≡  liminal  ~/my-app                    ● claude  * │  <- status bar
├──────────┬──────────────────────────────────────────┤
│ file     │  chat | editor               ▾ terminal  │  <- panel controls
│ tree     │                                           │
│          │  [conversation messages stream here]      │
│  src/    │                                           │
│  tests/  │  or                                       │
│  ...     │                                           │
│          │  [code editor with tabs when viewing      │
│          │   a file]                                 │
│          │                                           │
│          ├───────────────────────────────────────────┤
│          │ terminal (when open)                      │
│          ├───────────────────────────────────────────┤
│          │ settings / search / other panels          │
│          ├───────────────────────────────────────────┤
│          │ [pinned context chips]                    │
│          │ > type here...                            │  <- input bar
└──────────┴───────────────────────────────────────────┘
```

**Status bar** — project name, Claude connection status, settings gear (`*`)
**File tree** — toggle with `Cmd+B` or `/files`
**Main area** — switches between chat view and editor view (`Cmd+E`)
**Terminal** — toggle with `Cmd+J` or `/terminal`
**Input bar** — where you type commands and talk to the AI

## Talking to the AI

Just type natural language. The AI has full access to your project:

```
> add a dark mode toggle to the header component
> fix the bug where the form doesn't validate email addresses
> refactor the database module to use connection pooling
> explain how the authentication flow works
```

The AI will:
- Read relevant files to understand context
- Write or modify code
- Create new files if needed
- Run shell commands when appropriate
- Explain what it did and why

### Tips for Good Prompts

**Be specific about files:**
```
> in src/components/header.tsx, add a dark mode toggle button
```

**Reference the current file:**
If you have a file open in the editor, the AI knows about it:
```
> [open src/utils/auth.ts in editor]
> explain this file and suggest improvements
```

**Chain tasks:**
```
> add form validation to the signup page, then write tests for it
```

**Ask for reviews:**
```
/review
```
Reviews the current file (if one is open) or recent changes.

## File Editing

### Opening Files

- Click a file in the file tree
- The editor opens with syntax highlighting and LSP features

### Tabs

Multiple files can be open simultaneously:
- Click files in the tree to open them as tabs
- `Cmd+W` closes the active tab
- Dirty files show a `*` indicator
- `Cmd+S` saves the current file

### Editor Features

- **Syntax highlighting** via CodeMirror 6
- **Undo/Redo** — `Cmd+Z` / `Cmd+Shift+Z` (or use toolbar buttons)
- **LSP completions** — type to get autocomplete suggestions
- **Diagnostics** — errors and warnings highlighted inline
- **Go to definition** — via LSP
- **Hover info** — hover over symbols for type information

### Context Menu (Right-Click)

Right-click any file or folder in the file tree for:
- **Rename** — inline rename with auto-select
- **Delete** — remove file or folder
- **New File** — create a file in the selected directory
- **New Folder** — create a subdirectory

## Terminal

Toggle with `Cmd+J` or `/terminal`.

### Direct Commands

Prefix with `!`:
```
> !npm install
> !cargo test
> !git branch feature/new-thing
```

### Natural Language Commands

Prefix with `!!` — the AI translates to shell:
```
> !!find all files larger than 1MB
> !!what process is using port 3000
> !!compress all images in the public folder
```

### Error Interpretation

If a command exits with a non-zero code, the AI offers to explain the error and suggest fixes. You'll see an "interpret" button in the terminal panel.

## Git Workflow

Liminal integrates git through AI commands:

```
/status        # see what's changed
/diff          # view the diff
/commit        # AI writes a commit message based on changes
/commit "msg"  # commit with your own message
/log           # recent commit history
/pr            # create a pull request
/pr "title"    # PR with a specific description
```

The AI understands git context. You can also just talk:
```
> create a new branch called feature/auth and switch to it
> cherry-pick the last 3 commits from main
> rebase onto the latest main
```

## Change Review

When the AI modifies files, Liminal tracks every change:

- **Before/after snapshots** — see exactly what changed
- **Per-turn review** — accept or revert changes from each AI response
- **Diff view** — colored inline diffs showing additions and deletions

Changes appear in the conversation stream with accept/revert controls.

## Settings

Access via the `*` button in the status bar.

| Setting | Options | Default |
|---|---|---|
| Model | sonnet, opus, haiku | sonnet |
| Theme | dark, light, system | dark |
| Font size | 10-20 | 13 |
| Keybindings | default, vim, emacs | default |

Settings persist in `{data_dir}/settings.json`.

## Pinned Context

Pin files or text to keep them in the AI's context:

- **Pin a file** — right-click in file tree, or use the pin icon
- **Pin terminal output** — pin button in terminal panel
- **Pin arbitrary text** — via context commands

Pinned items appear as chips above the input bar. Click the `x` to unpin.

## Project Summary

```
/summary
```

Generates an AI overview of your project: structure, tech stack, key files, and architecture. Useful when first opening an unfamiliar codebase.

## Workflow Examples

### Starting a New Feature

```
/open ~/projects/my-app
> I want to add user authentication. Use JWT tokens, bcrypt for passwords,
  and create login/register API endpoints.
```

### Debugging

```
> the /api/users endpoint returns 500 when the email contains a plus sign
```

The AI will read the relevant code, identify the bug, and fix it.

### Code Review

```
/review
```

Or be specific:
```
> review src/services/payment.ts for security issues
```

### Refactoring

```
> refactor the database module to use the repository pattern.
  keep the existing tests passing.
```

### Writing Tests

```
> write comprehensive tests for the auth middleware.
  cover happy path, expired tokens, missing tokens, and invalid signatures.
```

### Quick Shell Tasks

```
!npm run build
!!what's using all the disk space in this project
!docker compose up -d
```

## Keyboard Reference

| Shortcut | Action |
|---|---|
| `Cmd+B` | Toggle file tree |
| `Cmd+J` | Toggle terminal |
| `Cmd+E` | Toggle chat/editor |
| `Cmd+W` | Close active tab |
| `Cmd+S` | Save file |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+Shift+F` | Search project |
| `Enter` | Send message |
| `Up/Down` | Input history |

## Command Reference

| Command | Args | Description |
|---|---|---|
| `/new` | `<name>` | Create project |
| `/open` | `<path>` | Open project |
| `/files` | | Toggle file tree |
| `/terminal` | | Toggle terminal |
| `/refresh` | | Refresh file tree |
| `/commit` | `[msg]` | Git commit |
| `/diff` | `[args]` | Git diff |
| `/status` | | Git status |
| `/pr` | `[desc]` | Create PR |
| `/log` | `[args]` | Git log |
| `/review` | | AI code review |
| `/summary` | | Project summary |
| `/help` | | Show commands |
| `!cmd` | | Run shell command |
| `!!query` | | Natural language shell |
