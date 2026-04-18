import { useState, useCallback } from 'react';
import { generateId } from '../data/sampleData';

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

  // Append a new task to the given project. taskData may carry a projectId field
  // that we strip — projectId is supplied separately as the destination project.
  const addTask = useCallback(
    (taskData, projectId) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const { projectId: _pid, ...rest } = taskData;
          return { ...proj, tasks: [...proj.tasks, { id: generateId(), ...rest }] };
        })
      );
    },
    [setProjects]
  );

  return { projects, setProjects, addTask };
}
