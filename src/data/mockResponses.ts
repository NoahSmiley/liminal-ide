// Canned responses per agent for mock engine

export const MOCK_RESPONSES: Record<string, string[]> = {
  sage: [
    "Let me break this down into actionable items:\n\n1. **Define the requirements** — What are the core user stories?\n2. **Prioritize** — What's the MVP vs nice-to-have?\n3. **Estimate** — How complex is each piece?\n\nI'll create tasks for each of these on the board.",
    "Here's what I'm seeing for the next sprint:\n\n1. Complete the authentication flow\n2. Build out the dashboard UI\n3. Set up the API endpoints\n4. Write integration tests\n\n**Acceptance criteria**: All endpoints return proper error codes, auth tokens expire correctly, and the dashboard loads in under 2 seconds.",
    "I've analyzed the current backlog. Here are my recommendations:\n\n1. Move the database schema task to **high priority** — it's blocking three other tasks\n2. The UI design can proceed in parallel with backend work\n3. QA should start writing test plans now, not after implementation",
  ],
  pixel: [
    "I've been thinking about the user experience here. We need to consider:\n\n- **Visual hierarchy** — The most important action should be immediately obvious\n- **Accessibility** — Color alone shouldn't convey meaning, use icons and labels too\n- **Consistency** — Follow our existing design patterns from the component library\n\nLet me sketch out a couple of layout options.",
    "From a design perspective, I'd recommend a **card-based layout** for this feature. Cards give us:\n\n- Clear visual boundaries between items\n- Room for metadata (status, assignee, tags)\n- Natural touch targets for mobile\n\nI'll reference our spacing scale — 4px base unit, with 8/12/16/24 for component spacing.",
    "The current color palette works well, but I want to make sure we're maintaining sufficient contrast ratios. WCAG AA requires 4.5:1 for normal text. Let me audit the proposed design against our theme tokens.",
  ],
  atlas: [
    "Let me think through the architecture here. There are two main approaches:\n\n**Option A: Monolithic**\n- Pros: Simpler deployment, shared state\n- Cons: Harder to scale, tighter coupling\n\n**Option B: Service-based**\n- Pros: Independent scaling, clear boundaries\n- Cons: Network overhead, eventual consistency\n\nGiven our current scale, I'd lean toward **Option A** with clear module boundaries we can split later.",
    "For the data layer, I recommend:\n\n```\nUser → has many → Projects → has many → Tasks\nTask → belongs to → Agent (assignee)\nTask → has many → Comments\n```\n\nWe should add proper indexes on `project_id` and `status` columns — those will be our most common query patterns.",
    "The API contract should follow REST conventions:\n\n- `GET /api/tasks?project_id=X&status=Y` — filterable list\n- `POST /api/tasks` — create with validation\n- `PATCH /api/tasks/:id` — partial updates only\n- `DELETE /api/tasks/:id` — soft delete with 30-day retention\n\nAll responses wrapped in `{ data, meta, errors }` envelope.",
  ],
  forge: [
    "Here's what the implementation looks like:\n\n```typescript\nasync function createTask(input: CreateTaskInput) {\n  const validated = taskSchema.parse(input);\n  const task = await db.tasks.create({\n    data: { ...validated, id: nanoid() },\n  });\n  return task;\n}\n```\n\nClean, type-safe, validated. I'll have a PR up in an hour.",
    "I've implemented the feature. Key changes:\n\n- Added `useTaskMutation` hook for optimistic updates\n- Task cards now support drag-and-drop reordering\n- Status transitions are validated on both client and server\n\nAll existing tests pass. Added 3 new test cases for edge cases.",
    "Found the bug. The issue was in the event handler — we were comparing string IDs with `===` but one was coming through as a number from the URL params. Fixed with explicit `String()` conversion.\n\n```typescript\n// Before (broken)\nif (task.id === params.id)\n// After (fixed)\nif (task.id === String(params.id))\n```",
  ],
  scout: [
    "Hold on — before we ship this, I have some questions:\n\n- What happens if the user submits the form twice quickly?\n- What if the network request fails mid-update?\n- Are we handling the case where another user modified this task in the meantime?\n\nI'd recommend adding **optimistic locking** with a version field. Also, the loading state doesn't seem to disable the submit button.",
    "I ran through the test matrix and found 3 issues:\n\n1. **Edge case**: Empty string titles pass validation but render as blank cards\n2. **Race condition**: Rapid status changes can leave the UI out of sync\n3. **Accessibility**: The drag handle doesn't have a keyboard alternative\n\nPriority fix: #1 is a quick validation add. #2 needs debouncing. #3 needs a dropdown fallback.",
    "Test coverage report:\n\n- **Unit tests**: 94% coverage on business logic ✅\n- **Integration tests**: All API endpoints covered ✅\n- **E2E tests**: Happy path covered, but missing error scenarios ⚠️\n\nI'll write the missing error path tests today. But what if the database connection drops during a transaction?",
  ],
  beacon: [
    "I've set up the deployment pipeline:\n\n1. **Push to main** → Triggers CI (lint, test, build)\n2. **CI passes** → Auto-deploy to staging\n3. **Manual approval** → Deploy to production\n4. **Rollback** → One-click revert to previous version\n\nHealth checks run every 30s. If 3 consecutive checks fail, we auto-rollback and alert the team.",
    "For monitoring, I recommend this stack:\n\n- **Error tracking**: Sentry with source maps\n- **Performance**: Web Vitals + custom metrics\n- **Uptime**: External ping every 60s from 3 regions\n- **Alerts**: PagerDuty for P1, Slack for P2-P3\n\nI'm worried about what happens during peak traffic. Let me set up load testing before we launch.",
    "The CI pipeline is running clean. Build times are currently:\n\n- Lint: 12s\n- Type check: 8s\n- Unit tests: 24s\n- Build: 18s\n- **Total: ~62s**\n\nI can cut this to ~35s by parallelizing lint and type check, and adding build caching. But what happens if the cache gets corrupted? I'll add a cache-busting fallback.",
  ],
};

// Which agents respond to which keywords in team chat
export const AGENT_TRIGGERS: Record<string, string[]> = {
  sage: ["plan", "break down", "requirements", "priority", "sprint", "scope", "task", "project"],
  pixel: ["design", "ui", "ux", "layout", "color", "font", "responsive", "accessible", "user"],
  atlas: ["architecture", "database", "schema", "api", "scale", "system", "structure", "pattern"],
  forge: ["implement", "code", "build", "fix", "bug", "function", "component", "feature"],
  scout: ["test", "qa", "edge case", "coverage", "validation", "error", "bug", "issue"],
  beacon: ["deploy", "ci", "pipeline", "monitor", "infra", "server", "production", "devops"],
};
