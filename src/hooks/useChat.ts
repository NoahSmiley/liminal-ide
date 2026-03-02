import { useChatStore } from "@/stores/chatStore";
import type { ChatTarget } from "@/types/chat";

export function useChat(projectId: string, target: ChatTarget) {
  const conversation = useChatStore((s) =>
    s.getConversation(projectId, target),
  );
  const getOrCreateConversation = useChatStore(
    (s) => s.getOrCreateConversation,
  );
  const addMessage = useChatStore((s) => s.addMessage);

  const messages = conversation?.messages ?? [];

  const sendMessage = (content: string) => {
    const conv = getOrCreateConversation(projectId, target);
    return addMessage(conv.id, { role: "user", agentId: null, content });
  };

  return {
    messages,
    conversation,
    sendMessage,
  };
}
