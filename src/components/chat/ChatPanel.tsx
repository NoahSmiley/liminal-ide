import { useEffect, useRef, useState, useCallback } from "react";
import { ChatHeader } from "./ChatHeader";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { useChatStore } from "@/stores/chatStore";
import { useAgentStore } from "@/stores/agentStore";
import { useBoardStore } from "@/stores/boardStore";
import { useUIStore } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { MOCK_RESPONSES, AGENT_TRIGGERS } from "@/data/mockResponses";
import { useMockAgent } from "@/hooks/useMockAgent";
import { streamTeamChat, sendTeamToolResult, sendTeamInterjection } from "@/lib/api";
import type { ChatEvent } from "@/lib/api";
import type { ChatTarget } from "@/types/chat";
import type { TaskStatus, TaskPriority } from "@/types/board";

interface ChatPanelProps {
  projectId: string;
  initialTarget?: ChatTarget;
}

export function ChatPanel({ projectId, initialTarget }: ChatPanelProps) {
  const [target, setTarget] = useState<ChatTarget>(
    initialTarget ?? { type: "team" },
  );
  const [typingAgentId, setTypingAgentId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [orchestrationConvId, setOrchestrationConvId] = useState<string | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [, setCurrentRound] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { getOrCreateConversation, addMessage } = useChatStore();
  const agents = useAgentStore((s) => s.agents);
  const backendConnected = useUIStore((s) => s.backendConnected);
  const { triggerPipeline } = useMockAgent(projectId);

  // Sync target with initialTarget prop (e.g. URL-based navigation)
  useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
    }
  }, [initialTarget?.type, initialTarget?.type === "agent" ? initialTarget.agentId : null]);

  // Abort in-flight request and reset streaming state when target changes
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTypingAgentId(null);
    setStreamingContent("");
  }, [target.type, target.type === "agent" ? target.agentId : null]);

  const conversation = useChatStore((s) =>
    s.getConversation(projectId, target),
  );
  const messages = conversation?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typingAgentId, streamingContent, scrollToBottom]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Strip orchestration control blocks and raw tool XML from agent text before displaying
  const stripControlBlocks = (text: string): string => {
    return text
      .replace(/<handoff>[\s\S]*?<\/handoff>/g, "")
      .replace(/<decision>[\s\S]*?<\/decision>/g, "")
      .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, "")
      .replace(/<function_output>[\s\S]*?<\/function_output>/g, "")
      .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
      .trim();
  };

  const pickRespondingAgent = (content: string): string => {
    if (target.type === "agent") return target.agentId;

    const lower = content.toLowerCase();
    for (const [agentId, triggers] of Object.entries(AGENT_TRIGGERS)) {
      if (triggers.some((t) => lower.includes(t))) {
        return agentId;
      }
    }
    return "sage";
  };

  const getRandomResponse = (agentId: string): string => {
    const responses = MOCK_RESPONSES[agentId];
    if (!responses || responses.length === 0) return "I'll look into that.";
    return responses[Math.floor(Math.random() * responses.length)]!;
  };

  // Execute a tool_use event against the board store
  const executeTool = (name: string, input: Record<string, unknown>): string => {
    const boardStore = useBoardStore.getState();

    switch (name) {
      case "create_task": {
        const task = boardStore.addTask({
          projectId,
          title: (input.title as string) ?? "Untitled",
          description: (input.description as string) ?? "",
          status: (input.status as TaskStatus) ?? "backlog",
          priority: (input.priority as TaskPriority) ?? "medium",
          assignedAgentId: (input.assigned_agent as string) ?? null,
          tags: [],
        });
        return JSON.stringify({ success: true, task_id: task.id, title: task.title });
      }
      case "update_task": {
        const taskId = input.task_id as string;
        if (!taskId) return JSON.stringify({ error: "task_id required" });
        const updates: Record<string, unknown> = {};
        if (input.title) updates.title = input.title;
        if (input.description) updates.description = input.description;
        if (input.status) updates.status = input.status;
        if (input.priority) updates.priority = input.priority;
        boardStore.updateTask(taskId, updates);
        return JSON.stringify({ success: true, task_id: taskId });
      }
      case "move_task": {
        const taskId = input.task_id as string;
        const newStatus = input.new_status as TaskStatus;
        if (!taskId || !newStatus) return JSON.stringify({ error: "task_id and new_status required" });
        boardStore.moveTask(taskId, newStatus, 0);
        return JSON.stringify({ success: true, task_id: taskId, new_status: newStatus });
      }
      case "list_tasks": {
        const statusFilter = input.status as TaskStatus | undefined;
        const tasks = statusFilter
          ? boardStore.getTasksByStatus(projectId, statusFilter)
          : boardStore.getTasksByProject(projectId);
        return JSON.stringify({
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            assigned_agent: t.assignedAgentId,
          })),
        });
      }
      case "delete_task": {
        const taskId = input.task_id as string;
        if (!taskId) return JSON.stringify({ error: "task_id required" });
        boardStore.deleteTask(taskId);
        return JSON.stringify({ success: true, task_id: taskId });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  };

  // Handle orchestrated team chat via /api/team-chat
  const handleTeamChat = async (content: string) => {
    const conv = getOrCreateConversation(projectId, target);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let conversationId = "";
    let accumulated = "";
    let currentAgentId = "sage"; // Sage always starts

    // Build board state snapshot for the backend
    const tasks = useBoardStore.getState().getTasksByProject(projectId);
    const boardState = tasks.length === 0
      ? "No tasks yet"
      : tasks.map((t) => `- [${t.status}] ${t.title} (${t.priority})${t.assignedAgentId ? ` → ${t.assignedAgentId}` : ""}`).join("\n");

    try {
      const chatMessages = [
        ...messages.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        { role: "user", content },
      ];

      const processTeamEvent = async (event: ChatEvent): Promise<void> => {
        switch (event.type) {
          case "conversation_id":
            conversationId = event.id;
            setOrchestrationConvId(event.id);
            setIsOrchestrating(true);
            break;

          case "agent_start":
            // Finalize any accumulated text from previous agent
            if (accumulated) {
              const cleaned = stripControlBlocks(accumulated);
              if (cleaned) {
                addMessage(conv.id, {
                  role: "agent",
                  agentId: currentAgentId,
                  content: cleaned,
                });
              }
              accumulated = "";
              setStreamingContent("");
            }
            currentAgentId = event.agent_id;
            setTypingAgentId(event.agent_id);
            useAgentStore.getState().setAgentStatus(event.agent_id, "working");
            break;

          case "agent_end":
            // Finalize accumulated text for this agent
            if (accumulated) {
              const cleaned = stripControlBlocks(accumulated);
              if (cleaned) {
                addMessage(conv.id, {
                  role: "agent",
                  agentId: event.agent_id,
                  content: cleaned,
                });
              }
              accumulated = "";
              setStreamingContent("");
            }
            useAgentStore.getState().setAgentStatus(event.agent_id, "idle");
            break;

          case "text_delta":
            accumulated += event.text;
            setStreamingContent(stripControlBlocks(accumulated));
            break;

          case "tool_use": {
            // Finalize text before tool use
            if (accumulated) {
              const cleaned = stripControlBlocks(accumulated);
              if (cleaned) {
                addMessage(conv.id, {
                  role: "agent",
                  agentId: currentAgentId,
                  content: cleaned,
                });
              }
              accumulated = "";
              setStreamingContent("");
            }

            // Execute tool locally
            const result = executeTool(event.name, event.input);

            addMessage(conv.id, {
              role: "agent",
              agentId: currentAgentId,
              content: `*Used tool: ${event.name}*`,
              metadata: { toolUse: true, toolName: event.name, toolInput: event.input },
            });

            // Send tool result back and continue orchestration
            if (conversationId) {
              const updatedTasks = useBoardStore.getState().getTasksByProject(projectId);
              const updatedBoardState = updatedTasks.length === 0
                ? "No tasks yet"
                : updatedTasks.map((t) => `- [${t.status}] ${t.title} (${t.priority})${t.assignedAgentId ? ` → ${t.assignedAgentId}` : ""}`).join("\n");

              for await (const followUp of sendTeamToolResult(
                {
                  conversation_id: conversationId,
                  tool_use_id: event.id,
                  result,
                  board_state: updatedBoardState,
                },
                abortController.signal,
              )) {
                await processTeamEvent(followUp);
              }
            }
            break;
          }

          case "orchestration_plan":
            // Could display a status message about the plan
            break;

          case "orchestration_complete":
            setIsOrchestrating(false);
            setOrchestrationConvId(null);
            setCurrentRound(0);
            break;

          case "round_start":
            setCurrentRound(event.round);
            break;

          case "round_end":
            break;

          case "user_interjection_ack":
            break;

          case "message_stop":
            break;

          case "error":
            if (accumulated) {
              const cleaned = stripControlBlocks(accumulated);
              if (cleaned) {
                addMessage(conv.id, {
                  role: "agent",
                  agentId: currentAgentId,
                  content: cleaned,
                });
              }
              accumulated = "";
              setStreamingContent("");
            }
            addMessage(conv.id, {
              role: "agent",
              agentId: currentAgentId,
              content: `*Error: ${event.message}*`,
            });
            break;
        }
      };

      for await (const event of streamTeamChat(
        {
          project_id: projectId,
          messages: chatMessages,
          board_state: boardState,
        },
        abortController.signal,
      )) {
        if (abortController.signal.aborted) break;
        await processTeamEvent(event);
      }

      // Finalize any remaining content
      if (accumulated) {
        const cleaned = stripControlBlocks(accumulated);
        if (cleaned) {
          addMessage(conv.id, {
            role: "agent",
            agentId: currentAgentId,
            content: cleaned,
          });
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorMsg = (err as Error).message ?? "Connection failed";
        addMessage(conv.id, {
          role: "agent",
          agentId: currentAgentId,
          content: `*Error: ${errorMsg}*`,
        });
      }
    } finally {
      setTypingAgentId(null);
      setStreamingContent("");
      useAgentStore.getState().resetAllStatuses();
      abortRef.current = null;
    }
  };

  // Mock fallback handler
  const handleMockChat = (content: string, respondingAgentId: string) => {
    getOrCreateConversation(projectId, target);
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      const currentConv = useChatStore.getState().getConversation(projectId, target);
      if (currentConv) {
        addMessage(currentConv.id, {
          role: "agent",
          agentId: respondingAgentId,
          content: getRandomResponse(respondingAgentId),
        });
      }
      setTypingAgentId(null);

      if (respondingAgentId === "sage" && target.type === "team") {
        triggerPipeline(content);
      }
    }, delay);
  };

  // Stop the current orchestration
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTypingAgentId(null);
    setStreamingContent("");
    setIsOrchestrating(false);
    setOrchestrationConvId(null);
    setCurrentRound(0);
    useAgentStore.getState().resetAllStatuses();
  }, []);

  // Handle user interjection during an active team orchestration
  const handleInterjection = async (content: string) => {
    if (!orchestrationConvId) return;

    const tasks = useBoardStore.getState().getTasksByProject(projectId);
    const boardState = tasks.length === 0
      ? "No tasks yet"
      : tasks.map((t) => `- [${t.status}] ${t.title} (${t.priority})${t.assignedAgentId ? ` → ${t.assignedAgentId}` : ""}`).join("\n");

    try {
      await sendTeamInterjection({
        conversation_id: orchestrationConvId,
        message: content,
        board_state: boardState,
      });
    } catch (err) {
      const conv = getOrCreateConversation(projectId, target);
      addMessage(conv.id, {
        role: "agent",
        agentId: "sage",
        content: `*Error sending interjection: ${(err as Error).message}*`,
      });
    }
  };

  const handleSend = (content: string) => {
    const conv = getOrCreateConversation(projectId, target);
    addMessage(conv.id, { role: "user", agentId: null, content });

    if (isOrchestrating && orchestrationConvId) {
      // Interjection during active orchestration
      handleInterjection(content);
    } else if (backendConnected) {
      // All backend chats use team orchestration — agents can collaborate
      // regardless of whether we're in team view or a DM
      setTypingAgentId("sage"); // Sage always starts
      handleTeamChat(content);
    } else {
      // Fallback mock mode
      const respondingAgentId = pickRespondingAgent(content);
      setTypingAgentId(respondingAgentId);
      handleMockChat(content, respondingAgentId);
    }
  };

  const typingAgent = typingAgentId
    ? agents.find((a) => a.id === typingAgentId)
    : null;

  const placeholder =
    target.type === "agent"
      ? `message ${agents.find((a) => a.id === target.agentId)?.name ?? "agent"}...`
      : "message the team...";

  // Register handleSend and handleStop with the UI store so the terminal can use them
  useEffect(() => {
    useUIStore.getState().setChatSendHandler(handleSend);
    useUIStore.getState().setChatStopHandler(isOrchestrating ? handleStop : null);
    useUIStore.getState().setChatPlaceholder(placeholder);
    return () => {
      useUIStore.getState().setChatSendHandler(null);
      useUIStore.getState().setChatStopHandler(null);
      useUIStore.getState().setChatPlaceholder("type a command...");
    };
  });

  // Sync disabled state to UI store — keep input enabled during orchestration for interjections
  useEffect(() => {
    useUIStore.getState().setChatInputDisabled(!isOrchestrating && !!typingAgentId);
  }, [typingAgentId, isOrchestrating]);

  return (
    <div className="flex h-full flex-col">
      <ChatHeader target={target} onTargetChange={setTarget} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="space-y-0 py-1">
          {messages.length === 0 && !typingAgent && (
            <EmptyState
              title="no messages"
              description={
                target.type === "team"
                  ? "send a message to start"
                  : `chat with ${agents.find((a) => a.id === (target as { type: "agent"; agentId: string }).agentId)?.name ?? "agent"}`
              }
            />
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {typingAgent && streamingContent && (
            <ChatMessage
              message={{
                id: "__streaming__",
                role: "agent",
                agentId: typingAgent.id,
                content: streamingContent,
                timestamp: Date.now(),
              }}
            />
          )}
          {typingAgent && !streamingContent && <TypingIndicator agent={typingAgent} />}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
