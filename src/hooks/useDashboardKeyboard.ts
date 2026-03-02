import { useKeyboardNavigation } from "./useKeyboardNavigation";
import { useUIStore } from "@/stores/uiStore";

interface UseDashboardKeyboardOptions {
  taskCount: number;
  onSelect: (index: number) => void;
}

export function useDashboardKeyboard({
  taskCount,
  onSelect,
}: UseDashboardKeyboardOptions) {
  const overlayOpen = useUIStore(
    (s) => s.commandPaletteOpen || s.shortcutHelpOpen || s.activeModal !== null,
  );

  return useKeyboardNavigation({
    itemCount: taskCount,
    enabled: !overlayOpen,
    onSelect,
    wrap: true,
  });
}
