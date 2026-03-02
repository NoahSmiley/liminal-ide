import { create } from "zustand";
import { nanoid } from "nanoid";
import type { ChatMessage, Conversation, ChatTarget } from "@/types/chat";

interface ChatState {
  conversations: Conversation[];
  getConversation: (projectId: string, target: ChatTarget) => Conversation | undefined;
  getOrCreateConversation: (projectId: string, target: ChatTarget) => Conversation;
  addMessage: (conversationId: string, message: Omit<ChatMessage, "id" | "timestamp">) => ChatMessage;
  clearConversation: (conversationId: string) => void;
}

function targetKey(target: ChatTarget): string {
  return target.type === "team" ? "team" : `agent:${target.agentId}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],

  getConversation: (projectId, target) => {
    const key = targetKey(target);
    return get().conversations.find(
      (c) => c.projectId === projectId && targetKey(c.target) === key,
    );
  },

  getOrCreateConversation: (projectId, target) => {
    const existing = get().getConversation(projectId, target);
    if (existing) return existing;

    const conversation: Conversation = {
      id: nanoid(),
      projectId,
      target,
      messages: [],
    };
    set((s) => ({ conversations: [...s.conversations, conversation] }));
    return conversation;
  },

  addMessage: (conversationId, messageData) => {
    const message: ChatMessage = {
      ...messageData,
      id: nanoid(),
      timestamp: Date.now(),
    };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message] }
          : c,
      ),
    }));
    return message;
  },

  clearConversation: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, messages: [] } : c,
      ),
    })),
}));
