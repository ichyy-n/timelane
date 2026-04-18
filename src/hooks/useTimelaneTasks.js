import { useState, useCallback } from 'react';

// useTimelaneTasks: extracts tasks/projects state + CRUD + JSON I/O from App.jsx.
// onChange is invoked AFTER every state mutation so the host (App.jsx) can record
// undo/redo history. The host keeps history management; this hook stays presentation-free.
export function useTimelaneTasks(initialProjects = [], { onChange } = {}) {
  const [projects, setProjectsRaw] = useState(initialProjects);

  const setProjects = useCallback(
    (updater) => {
      setProjectsRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        onChange?.(next);
        return next;
      });
    },
    [onChange]
  );

  return { projects, setProjects };
}
