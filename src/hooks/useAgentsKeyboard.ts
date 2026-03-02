import { useKeyboardNavigation } from "./useKeyboardNavigation";
import { useUIStore } from "@/stores/uiStore";

interface UseAgentsKeyboardOptions {
  agentCount: number;
  onSelect: (index: number) => void;
}

export function useAgentsKeyboard({
  agentCount,
  onSelect,
}: UseAgentsKeyboardOptions) {
  const overlayOpen = useUIStore(
    (s) => s.commandPaletteOpen || s.shortcutHelpOpen || s.activeModal !== null,
  );

  return useKeyboardNavigation({
    itemCount: agentCount,
    enabled: !overlayOpen,
    onSelect,
    wrap: true,
  });
}
