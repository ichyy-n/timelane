import { useState, useCallback } from 'react';
import { generateId } from '../data/sampleData';

// Collect all descendant task IDs of a given parent (used by deleteTask to drop subtrees).
function getDescendantIds(tasks, parentId) {
  const ids = new Set();
  const childMap = new Map();
  tasks.forEach((t) => {
    const pid = t.parentId || '__root__';
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid).push(t);
  });
  function walk(pid) {
    const children = childMap.get(pid) || [];
    for (const c of children) {
      ids.add(c.id);
      walk(c.id);
    }
  }
  walk(parentId);
  return ids;
}

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

  // Update an existing task. If formData.projectId differs from originalProjectId,
  // the task is moved across projects (removed from origin, appended to target).
  const editTask = useCallback(
    (originalTask, originalProjectId, formData) => {
      const targetProjectId = formData.projectId || originalProjectId;
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== targetProjectId) {
            if (originalTask && proj.tasks.some((t) => t.id === originalTask.id)) {
              return { ...proj, tasks: proj.tasks.filter((t) => t.id !== originalTask.id) };
            }
            return proj;
          }
          const { projectId: _pid, ...taskData } = formData;
          const existsHere = proj.tasks.some((t) => t.id === originalTask.id);
          if (existsHere) {
            return {
              ...proj,
              tasks: proj.tasks.map((t) =>
                t.id === originalTask.id ? { ...t, ...taskData } : t
              ),
            };
          }
          return {
            ...proj,
            tasks: [...proj.tasks, { ...originalTask, ...taskData }],
          };
        })
      );
    },
    [setProjects]
  );

  // Pure delete (no confirm dialog — host owns UI). Removes the task and all descendants.
  const deleteTask = useCallback(
    (taskId, projectId) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const descs = getDescendantIds(p.tasks, taskId);
          descs.add(taskId);
          return { ...p, tasks: p.tasks.filter((t) => !descs.has(t.id)) };
        })
      );
    },
    [setProjects]
  );

  return { projects, setProjects, addTask, editTask, deleteTask };
}
