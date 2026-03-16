import { useState, useCallback, useMemo } from "react";
import Toolbar from "./components/Toolbar";
import TaskList from "./components/TaskList";
import GanttChart from "./components/GanttChart";
import TaskModal from "./components/TaskModal";
import { createSampleProject, generateId } from "./data/sampleData";
import "./App.css";

function getMonthLabels(startDate, count) {
  const [y, m] = startDate.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(y, m - 1 + i);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}/${String(month).padStart(2, "0")}`;
  });
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

// Check if a task has children
function hasChildren(tasks, taskId) {
  return tasks.some((t) => t.parentId === taskId);
}

function App() {
  const [project, setProject] = useState(createSampleProject);
  const [modalState, setModalState] = useState({ open: false, task: null });
  const [collapsedIds, setCollapsedIds] = useState(new Set());

  const months = getMonthLabels(project.project.startDate, 24);

  const { ordered, depthMap } = useMemo(
    () => buildTreeOrder(project.tasks),
    [project.tasks]
  );

  // Filter out hidden (collapsed parent) tasks
  const visibleTasks = useMemo(() => {
    const hidden = new Set();
    for (const id of collapsedIds) {
      const descs = getDescendantIds(project.tasks, id);
      descs.forEach((d) => hidden.add(d));
    }
    return ordered.filter((t) => !hidden.has(t.id));
  }, [ordered, collapsedIds, project.tasks]);

  const toggleCollapse = useCallback((taskId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleAddTask = () => {
    setModalState({ open: true, task: null });
  };

  const handleTaskClick = (task) => {
    setModalState({ open: true, task });
  };

  const handleModalClose = () => {
    setModalState({ open: false, task: null });
  };

  const handleModalSave = (formData) => {
    setProject((prev) => {
      const newTasks = modalState.task
        ? prev.tasks.map((t) =>
            t.id === modalState.task.id ? { ...t, ...formData } : t
          )
        : [...prev.tasks, { id: generateId(), ...formData }];
      return { ...prev, tasks: newTasks };
    });
    handleModalClose();
  };

  const handleDeleteTask = (taskId) => {
    // Delete task and all descendants
    const descs = getDescendantIds(project.tasks, taskId);
    descs.add(taskId);
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => !descs.has(t.id)),
    }));
  };

  const handleTaskUpdate = useCallback((taskId, updates) => {
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    }));
  }, []);

  const handleProjectNameChange = (name) => {
    setProject((prev) => ({
      ...prev,
      project: { ...prev.project, name },
    }));
  };

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
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
        if (data.version && data.project && data.tasks) {
          setProject(data);
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

  return (
    <div className="app">
      <Toolbar
        projectName={project.project.name}
        onProjectNameChange={handleProjectNameChange}
        onAddTask={handleAddTask}
        onSave={handleSave}
        onLoad={handleLoad}
      />
      <div className="main-content">
        <div className="left-panel">
          <TaskList
            tasks={visibleTasks}
            allTasks={project.tasks}
            depthMap={depthMap}
            collapsedIds={collapsedIds}
            onToggleCollapse={toggleCollapse}
            onTaskClick={handleTaskClick}
            onDelete={handleDeleteTask}
          />
        </div>
        <div className="right-panel">
          <GanttChart
            tasks={visibleTasks}
            allTasks={project.tasks}
            months={months}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
      </div>
      <div className="status-bar">
        Period: {months[0]} - {months[months.length - 1]} | Tasks:{" "}
        {project.tasks.filter((t) => t.type !== "milestone").length} |
        Milestones: {project.tasks.filter((t) => t.type === "milestone").length}
      </div>

      {modalState.open && (
        <TaskModal
          task={modalState.task}
          allTasks={project.tasks}
          onSave={handleModalSave}
          onClose={handleModalClose}
          projectStart={project.project.startDate}
        />
      )}
    </div>
  );
}

export default App;
