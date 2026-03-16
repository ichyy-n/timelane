import { useState, useCallback } from "react";
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

function App() {
  const [project, setProject] = useState(createSampleProject);
  const [modalState, setModalState] = useState({ open: false, task: null });

  const months = getMonthLabels(project.project.startDate, 24);

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
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
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
            tasks={project.tasks}
            onTaskClick={handleTaskClick}
            onDelete={handleDeleteTask}
          />
        </div>
        <div className="right-panel">
          <GanttChart
            tasks={project.tasks}
            months={months}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
      </div>
      <div className="status-bar">
        Period: {months[0]} - {months[months.length - 1]} | Tasks:{" "}
        {project.tasks.length}
      </div>

      {modalState.open && (
        <TaskModal
          task={modalState.task}
          onSave={handleModalSave}
          onClose={handleModalClose}
          projectStart={project.project.startDate}
        />
      )}
    </div>
  );
}

export default App;
