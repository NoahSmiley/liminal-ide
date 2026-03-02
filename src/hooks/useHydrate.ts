import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useBoardStore } from "@/stores/boardStore";
import { MOCK_PROJECTS } from "@/data/mockProjects";
import { MOCK_TASKS } from "@/data/mockTasks";

export function useHydrate() {
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const { projects } = useProjectStore.getState();
    if (projects.length === 0) {
      useProjectStore.setState({
        projects: MOCK_PROJECTS,
        activeProjectId: MOCK_PROJECTS[0]?.id ?? null,
      });
    }

    const { tasks } = useBoardStore.getState();
    if (tasks.length === 0) {
      useBoardStore.setState({ tasks: MOCK_TASKS });
    }
  }, []);
}
