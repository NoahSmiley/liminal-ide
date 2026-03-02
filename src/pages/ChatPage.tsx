import { useParams } from "react-router-dom";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatTarget } from "@/types/chat";

export function ChatPage() {
  const { id: projectId, agentId } = useParams();

  if (!projectId) return null;

  const initialTarget: ChatTarget = agentId
    ? { type: "agent", agentId }
    : { type: "team" };

  return (
    <div className="h-full">
      <ChatPanel projectId={projectId} initialTarget={initialTarget} />
    </div>
  );
}
