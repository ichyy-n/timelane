import { useState, useCallback } from 'react';
import { generateId, generateProjectId } from '../data/sampleData';

// Migrate offset-based legacy tasks (startMonth/endMonth) to date-based (startDate/endDate).
// Used during JSON import so old saves keep working.
function convertLegacyTask(task, viewRange) {
  if (task.startDate) return task;
  let y = viewRange.startYear;
  let m = viewRange.startMonth + task.startMonth;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;

  let ey = viewRange.startYear;
  let em = viewRange.startMonth + (task.endMonth ?? task.startMonth);
  while (em > 12) { em -= 12; ey++; }
  while (em < 1) { em += 12; ey--; }
  const lastDay = new Date(ey, em, 0).getDate();
  const endDate = `${ey}-${String(em).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const converted = { ...task, startDate, endDate };
  delete converted.startMonth;
  delete converted.endMonth;

  if (converted.dates) {
    converted.dates = converted.dates.map((d) => {
      if (d.date && d.date.length === 7) {
        return { ...d, date: d.date + '-15' };
      }
      return d;
    });
  }
  return converted;
}

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

  // Download current state as a JSON file. Host passes presentation flags (viewRange,
  // colorMode, darkMode) since they live outside this hook.
  const saveJson = useCallback(
    ({ viewRange, colorMode, darkMode } = {}) => {
      const data = { version: '2.0', projects, viewRange, colorMode, darkMode };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gantt-data.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    [projects]
  );

  // Load JSON file from a file input event. Updates projects via setProjects, and
  // hands viewRange/colorMode/darkMode (when present) back to the host via onMeta.
  const loadJson = useCallback(
    (event, currentViewRange, { onMeta } = {}) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.version === '2.0' && data.projects) {
            const vr = data.viewRange || currentViewRange;
            const convertedProjects = data.projects.map((proj) => ({
              ...proj,
              tasks: proj.tasks.map((t) => convertLegacyTask(t, vr)),
            }));
            setProjects(convertedProjects);
            onMeta?.({
              viewRange: data.viewRange,
              colorMode: data.colorMode,
              darkMode: data.darkMode,
            });
          } else if (data.version && data.project && data.tasks) {
            const vr = data.viewRange || currentViewRange;
            setProjects([
              {
                id: generateProjectId(),
                name: data.project.name || 'Imported Project',
                collapsed: false,
                tasks: data.tasks.map((t) => convertLegacyTask(t, vr)),
              },
            ]);
          } else {
            alert('Invalid project file format.');
          }
        } catch {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    [setProjects]
  );

  return { projects, setProjects, addTask, editTask, deleteTask, saveJson, loadJson };
}
