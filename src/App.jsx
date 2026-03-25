import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Toolbar from "./components/Toolbar";
import TaskList from "./components/TaskList";
import GanttChart from "./components/GanttChart";
import TaskModal from "./components/TaskModal";
import { createSampleProjects, generateId, generateProjectId } from "./data/sampleData";
import { exportToExcel } from "./utils/exportExcel";
import "./App.css";

function getMonthLabels(startYear, startMonth, endYear, endMonth) {
  const labels = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    labels.push(`${y}/${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return labels;
}

// Convert legacy startMonth/endMonth (offset-based) to startDate/endDate (YYYY-MM-DD)
function convertLegacyTask(task, viewRange) {
  if (task.startDate) return task;
  let y = viewRange.startYear;
  let m = viewRange.startMonth + task.startMonth;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;

  let ey = viewRange.startYear;
  let em = viewRange.startMonth + (task.endMonth ?? task.startMonth);
  while (em > 12) { em -= 12; ey++; }
  while (em < 1) { em += 12; ey--; }
  const lastDay = new Date(ey, em, 0).getDate();
  const endDate = `${ey}-${String(em).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const converted = { ...task, startDate, endDate };
  delete converted.startMonth;
  delete converted.endMonth;

  // Convert milestone dates from "YYYY-MM" to "YYYY-MM-15"
  if (converted.dates) {
    converted.dates = converted.dates.map((d) => {
      if (d.date && d.date.length === 7) {
        return { ...d, date: d.date + "-15" };
      }
      return d;
    });
  }

  return converted;
}

// Build tree-ordered flat list
function buildTreeOrder(tasks) {
  const childMap = new Map();
  tasks.forEach((t) => {
    const pid = t.parentId || "__root__";
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid).push(t);
  });

  const result = [];
  const depthMap = new Map();

  function walk(parentId, depth) {
    const children = childMap.get(parentId) || [];
    for (const task of children) {
      result.push(task);
      depthMap.set(task.id, depth);
      walk(task.id, depth + 1);
    }
  }
  walk("__root__", 0);
  return { ordered: result, depthMap };
}

// Get all descendant IDs of a task
function getDescendantIds(tasks, parentId) {
  const ids = new Set();
  const childMap = new Map();
  tasks.forEach((t) => {
    const pid = t.parentId || "__root__";
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

// A3: Dynamic viewRange initial value
function computeDefaultViewRange() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let startMonth = currentMonth - 6;
  let startYear = currentYear;
  if (startMonth < 1) { startMonth += 12; startYear -= 1; }
  let endMonth = currentMonth + 6;
  let endYear = currentYear;
  if (endMonth > 12) { endMonth -= 12; endYear += 1; }
  return { startYear, startMonth, endYear, endMonth };
}

// A2: History constants
const MAX_HISTORY = 50;

function App() {
  const [projects, setProjects] = useState(createSampleProjects);
  const [modalState, setModalState] = useState({ open: false, task: null, projectId: null });
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [colorMode, setColorMode] = useState(true);
  const [viewRange, setViewRange] = useState(computeDefaultViewRange);

  // A2: Undo/Redo - use refs for history to avoid async state coordination issues
  const historyRef = useRef({ stack: [], index: -1 });
  const isUndoRedoRef = useRef(false);

  // B2: Scroll sync refs
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const isSyncingRef = useRef(false);

  // C2: viewMode state
  const [viewMode, setViewMode] = useState('month');

  // C3: Search/filter state
  const [searchQuery, setSearchQuery] = useState('');

  // B5: Inline project creation
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // A2: Initialize history
  useEffect(() => {
    historyRef.current = { stack: [projects], index: 0 };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A2: setProjects wrapper that records history
  const setProjectsWithHistory = useCallback((updater) => {
    setProjects((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!isUndoRedoRef.current) {
        const h = historyRef.current;
        const newStack = h.stack.slice(0, h.index + 1);
        newStack.push(next);
        if (newStack.length > MAX_HISTORY) newStack.shift();
        historyRef.current = { stack: newStack, index: newStack.length - 1 };
      }
      return next;
    });
  }, []);

  // A2: Undo/Redo keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const h = historyRef.current;
        if (h.index > 0) {
          h.index -= 1;
          isUndoRedoRef.current = true;
          setProjects(h.stack[h.index]);
          setTimeout(() => { isUndoRedoRef.current = false; }, 0);
        }
      }
      if (isMod && ((e.key === "z" && e.shiftKey) || (e.key === "y"))) {
        e.preventDefault();
        const h = historyRef.current;
        if (h.index < h.stack.length - 1) {
          h.index += 1;
          isUndoRedoRef.current = true;
          setProjects(h.stack[h.index]);
          setTimeout(() => { isUndoRedoRef.current = false; }, 0);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // A1: Electron auto-save - load on mount
  useEffect(() => {
    window.electronAPI?.loadData().then((data) => {
      if (data && data.projects) {
        isUndoRedoRef.current = true;
        setProjects(data.projects);
        if (data.viewRange) setViewRange(data.viewRange);
        if (data.colorMode !== undefined) setColorMode(data.colorMode);
        setTimeout(() => {
          isUndoRedoRef.current = false;
          historyRef.current = { stack: [data.projects], index: 0 };
        }, 0);
      }
    }).catch(() => { /* not in Electron, ignore */ });
  }, []);

  // A1: Debounced auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      window.electronAPI?.saveData({ version: "2.0", projects, viewRange, colorMode });
    }, 1000);
    return () => clearTimeout(timer);
  }, [projects, viewRange, colorMode]);

  // B2: Scroll sync handler
  const syncScroll = useCallback((source) => (e) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const target = source === "left" ? rightPanelRef.current : leftPanelRef.current;
    if (target) target.scrollTop = e.currentTarget.scrollTop;
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  const months = useMemo(
    () => getMonthLabels(viewRange.startYear, viewRange.startMonth, viewRange.endYear, viewRange.endMonth),
    [viewRange]
  );

  // Build display rows
  const displayRows = useMemo(() => {
    const rows = [];
    for (const proj of projects) {
      rows.push({ type: "project-header", project: proj });
      if (!collapsedProjects.has(proj.id)) {
        const { ordered, depthMap } = buildTreeOrder(proj.tasks);
        const hidden = new Set();
        for (const id of collapsedIds) {
          const descs = getDescendantIds(proj.tasks, id);
          descs.forEach((d) => hidden.add(d));
        }
        for (const task of ordered) {
          if (!hidden.has(task.id)) {
            rows.push({
              type: "task",
              task,
              projectId: proj.id,
              depth: depthMap.get(task.id) || 0,
              hasChildren: proj.tasks.some((t) => t.parentId === task.id),
            });
          }
        }
      }
    }
    return rows;
  }, [projects, collapsedProjects, collapsedIds]);

  // C3: Filtered display rows
  const filteredDisplayRows = useMemo(() => {
    if (!searchQuery.trim()) return displayRows;
    const q = searchQuery.toLowerCase();
    return displayRows.filter(row => {
      if (row.type === 'project-header') {
        return row.project.name.toLowerCase().includes(q);
      }
      const t = row.task;
      return (
        t.name?.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q)
      );
    });
  }, [displayRows, searchQuery]);

  const toggleCollapse = useCallback((taskId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const toggleProjectCollapse = useCallback((projectId) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const handleAddTask = (projectId) => {
    setModalState({ open: true, task: null, projectId: projectId || projects[0]?.id });
  };

  const handleTaskClick = (task, projectId) => {
    setModalState({ open: true, task, projectId });
  };

  const handleModalClose = () => {
    setModalState({ open: false, task: null, projectId: null });
  };

  const handleModalSave = (formData) => {
    const targetProjectId = formData.projectId || modalState.projectId;
    setProjectsWithHistory((prev) =>
      prev.map((proj) => {
        if (proj.id !== targetProjectId) {
          if (modalState.task && proj.tasks.some((t) => t.id === modalState.task.id)) {
            return { ...proj, tasks: proj.tasks.filter((t) => t.id !== modalState.task.id) };
          }
          return proj;
        }
        const { projectId: _pid, ...taskData } = formData;
        if (modalState.task) {
          const existsHere = proj.tasks.some((t) => t.id === modalState.task.id);
          if (existsHere) {
            return {
              ...proj,
              tasks: proj.tasks.map((t) =>
                t.id === modalState.task.id ? { ...t, ...taskData } : t
              ),
            };
          } else {
            return {
              ...proj,
              tasks: [...proj.tasks, { ...modalState.task, ...taskData }],
            };
          }
        }
        return {
          ...proj,
          tasks: [...proj.tasks, { id: generateId(), ...taskData }],
        };
      })
    );
    handleModalClose();
  };

  const handleDeleteTask = (taskId, projectId) => {
    setProjectsWithHistory((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const descs = getDescendantIds(proj.tasks, taskId);
        descs.add(taskId);
        return { ...proj, tasks: proj.tasks.filter((t) => !descs.has(t.id)) };
      })
    );
  };

  const handleTaskUpdate = useCallback((taskId, updates, projectId) => {
    setProjectsWithHistory((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          tasks: proj.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        };
      })
    );
  }, [setProjectsWithHistory]);

  // B5: Inline project creation (replaces prompt())
  const handleStartAddProject = () => {
    setAddingProject(true);
    setNewProjectName("");
  };

  const handleConfirmAddProject = () => {
    const name = newProjectName.trim();
    if (!name) {
      setAddingProject(false);
      return;
    }
    setProjectsWithHistory((prev) => [
      ...prev,
      { id: generateProjectId(), name, collapsed: false, tasks: [] },
    ]);
    setAddingProject(false);
    setNewProjectName("");
  };

  const handleCancelAddProject = () => {
    setAddingProject(false);
    setNewProjectName("");
  };

  const handleDeleteProject = (projectId) => {
    setProjectsWithHistory((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleProjectNameChange = (projectId, name) => {
    setProjectsWithHistory((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name } : p))
    );
  };

  // B3: Task reorder (drag & drop)
  const handleReorderTask = useCallback((draggedItem, targetItem) => {
    if (draggedItem.projectId !== targetItem.projectId) return;
    setProjectsWithHistory((prev) =>
      prev.map((proj) => {
        if (proj.id !== draggedItem.projectId) return proj;
        const tasks = [...proj.tasks];
        const fromIdx = tasks.findIndex((t) => t.id === draggedItem.taskId);
        const toIdx = tasks.findIndex((t) => t.id === targetItem.taskId);
        if (fromIdx === -1 || toIdx === -1) return proj;
        const [moved] = tasks.splice(fromIdx, 1);
        tasks.splice(toIdx, 0, moved);
        return { ...proj, tasks };
      })
    );
  }, [setProjectsWithHistory]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(projects, viewRange);
  }, [projects, viewRange]);

  const handleSave = () => {
    const data = { version: "2.0", projects, viewRange, colorMode };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gantt-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.version === "2.0" && data.projects) {
          const vr = data.viewRange || viewRange;
          const convertedProjects = data.projects.map((proj) => ({
            ...proj,
            tasks: proj.tasks.map((t) => convertLegacyTask(t, vr)),
          }));
          setProjectsWithHistory(convertedProjects);
          if (data.viewRange) setViewRange(data.viewRange);
          if (data.colorMode !== undefined) setColorMode(data.colorMode);
        } else if (data.version && data.project && data.tasks) {
          const vr = data.viewRange || viewRange;
          setProjectsWithHistory([
            {
              id: generateProjectId(),
              name: data.project.name || "Imported Project",
              collapsed: false,
              tasks: data.tasks.map((t) => convertLegacyTask(t, vr)),
            },
          ]);
        } else {
          alert("Invalid project file format.");
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Flatten all tasks for the modal's parent options
  const allTasksFlat = useMemo(
    () => projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectId: p.id }))),
    [projects]
  );

  return (
    <div className="app">
      <Toolbar
        onAddTask={() => handleAddTask(null)}
        onAddProject={handleStartAddProject}
        onSave={handleSave}
        onLoad={handleLoad}
        onExportExcel={handleExportExcel}
        viewRange={viewRange}
        onViewRangeChange={setViewRange}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {/* B5: Inline project name input */}
      {addingProject && (
        <div className="inline-project-input">
          <input
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmAddProject();
              if (e.key === "Escape") handleCancelAddProject();
            }}
            onBlur={handleCancelAddProject}
            autoFocus
          />
        </div>
      )}
      <div className="main-content">
        <div className="left-panel" ref={leftPanelRef} onScroll={syncScroll("left")}>
          <TaskList
            displayRows={filteredDisplayRows}
            collapsedIds={collapsedIds}
            collapsedProjects={collapsedProjects}
            onToggleCollapse={toggleCollapse}
            onToggleProjectCollapse={toggleProjectCollapse}
            onTaskClick={handleTaskClick}
            onDelete={handleDeleteTask}
            onDeleteProject={handleDeleteProject}
            onProjectNameChange={handleProjectNameChange}
            onReorder={handleReorderTask}
            colorMode={colorMode}
          />
        </div>
        <div className="right-panel" ref={rightPanelRef} onScroll={syncScroll("right")}>
          <GanttChart
            displayRows={filteredDisplayRows}
            months={months}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
            colorMode={colorMode}
            viewRange={viewRange}
            viewMode={viewMode}
            tasks={allTasksFlat}
          />
        </div>
      </div>
      <div className="status-bar">
        Period: {months[0]} - {months[months.length - 1]} | Projects:{" "}
        {projects.length} | Tasks:{" "}
        {projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.type !== "milestone").length, 0)} |
        Milestones:{" "}
        {projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.type === "milestone").length, 0)}
      </div>

      {modalState.open && (
        <TaskModal
          task={modalState.task}
          projects={projects}
          currentProjectId={modalState.projectId}
          onSave={handleModalSave}
          onClose={handleModalClose}
          viewRange={viewRange}
          allTasks={allTasksFlat}
        />
      )}
    </div>
  );
}

export default App;
