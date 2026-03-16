import { useState, useCallback, useMemo } from "react";
import Toolbar from "./components/Toolbar";
import TaskList from "./components/TaskList";
import GanttChart from "./components/GanttChart";
import TaskModal from "./components/TaskModal";
import { createSampleProjects, generateId, generateProjectId } from "./data/sampleData";
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

function App() {
  const [projects, setProjects] = useState(createSampleProjects);
  const [modalState, setModalState] = useState({ open: false, task: null, projectId: null });
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [colorMode, setColorMode] = useState(true);
  const [viewRange, setViewRange] = useState({
    startYear: 2025,
    startMonth: 4,
    endYear: 2026,
    endMonth: 3,
  });

  const months = useMemo(
    () => getMonthLabels(viewRange.startYear, viewRange.startMonth, viewRange.endYear, viewRange.endMonth),
    [viewRange]
  );

  // Build display rows: [{type: "project-header", project} | {type: "task", task, projectId}]
  const displayRows = useMemo(() => {
    const rows = [];
    for (const proj of projects) {
      rows.push({ type: "project-header", project: proj });
      if (!collapsedProjects.has(proj.id)) {
        const { ordered, depthMap } = buildTreeOrder(proj.tasks);
        // Filter out tasks hidden by collapsed parent tasks
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
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== targetProjectId) {
          // If editing and task was in a different project, remove it from old project
          if (modalState.task && proj.tasks.some((t) => t.id === modalState.task.id)) {
            return { ...proj, tasks: proj.tasks.filter((t) => t.id !== modalState.task.id) };
          }
          return proj;
        }
        const { projectId: _pid, ...taskData } = formData;
        if (modalState.task) {
          // Check if task was already in this project
          const existsHere = proj.tasks.some((t) => t.id === modalState.task.id);
          if (existsHere) {
            return {
              ...proj,
              tasks: proj.tasks.map((t) =>
                t.id === modalState.task.id ? { ...t, ...taskData } : t
              ),
            };
          } else {
            // Moving from another project
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
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const descs = getDescendantIds(proj.tasks, taskId);
        descs.add(taskId);
        return { ...proj, tasks: proj.tasks.filter((t) => !descs.has(t.id)) };
      })
    );
  };

  const handleTaskUpdate = useCallback((taskId, updates, projectId) => {
    setProjects((prev) =>
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
  }, []);

  const handleAddProject = () => {
    const name = prompt("Project name:");
    if (!name) return;
    setProjects((prev) => [
      ...prev,
      { id: generateProjectId(), name, collapsed: false, tasks: [] },
    ]);
  };

  const handleDeleteProject = (projectId) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleProjectNameChange = (projectId, name) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name } : p))
    );
  };

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
          setProjects(data.projects);
          if (data.viewRange) setViewRange(data.viewRange);
          if (data.colorMode !== undefined) setColorMode(data.colorMode);
        } else if (data.version && data.project && data.tasks) {
          // Legacy v1 format: convert to multi-project
          setProjects([
            {
              id: generateProjectId(),
              name: data.project.name || "Imported Project",
              collapsed: false,
              tasks: data.tasks,
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
        onAddProject={handleAddProject}
        onSave={handleSave}
        onLoad={handleLoad}
        viewRange={viewRange}
        onViewRangeChange={setViewRange}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
      />
      <div className="main-content">
        <div className="left-panel">
          <TaskList
            displayRows={displayRows}
            collapsedIds={collapsedIds}
            collapsedProjects={collapsedProjects}
            onToggleCollapse={toggleCollapse}
            onToggleProjectCollapse={toggleProjectCollapse}
            onTaskClick={handleTaskClick}
            onDelete={handleDeleteTask}
            onDeleteProject={handleDeleteProject}
            onProjectNameChange={handleProjectNameChange}
            colorMode={colorMode}
          />
        </div>
        <div className="right-panel">
          <GanttChart
            displayRows={displayRows}
            months={months}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
            colorMode={colorMode}
            viewRange={viewRange}
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
        />
      )}
    </div>
  );
}

export default App;
