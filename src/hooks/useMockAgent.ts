import { useCallback } from "react";
import { createTasksFromPrompt, startTaskProgression } from "@/lib/mockEngine";

export function useMockAgent(projectId: string) {
  const triggerPipeline = useCallback(
    (prompt: string) => {
      // PM creates tasks
      const taskIds = createTasksFromPrompt(projectId, prompt);

      // Start progressing each task after a delay
      taskIds.forEach((taskId, index) => {
        setTimeout(() => {
          startTaskProgression(taskId);
        }, (index + 1) * 2000); // Stagger starts
      });

      return taskIds;
    },
    [projectId],
  );

  return { triggerPipeline };
}
