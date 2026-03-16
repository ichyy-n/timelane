import { useState } from "react";

export default function TaskList({
  displayRows,
  collapsedIds,
  collapsedProjects,
  onToggleCollapse,
  onToggleProjectCollapse,
  onTaskClick,
  onDelete,
  onDeleteProject,
  onProjectNameChange,
  colorMode = true,
}) {
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editName, setEditName] = useState("");

  const startEditProjectName = (e, proj) => {
    e.stopPropagation();
    setEditingProjectId(proj.id);
    setEditName(proj.name);
  };

  const finishEditProjectName = (projectId) => {
    if (editName.trim()) {
      onProjectNameChange(projectId, editName.trim());
    }
    setEditingProjectId(null);
  };

  return (
    <div className="task-list">
      <div className="task-list-header">
        <span className="col-name">Task</span>
        <span className="col-assignee">Assignee</span>
        <span className="col-location">Location</span>
        <span className="col-actions"></span>
      </div>
      {displayRows.map((row) => {
        if (row.type === "project-header") {
          const proj = row.project;
          const isCollapsed = collapsedProjects.has(proj.id);
          return (
            <div
              key={`proj-${proj.id}`}
              className="task-list-row project-header-row"
              onClick={() => onToggleProjectCollapse(proj.id)}
            >
              <span className="col-name project-header-name">
                <span className="tree-toggle">
                  {isCollapsed ? "▶" : "▼"}
                </span>
                {editingProjectId === proj.id ? (
                  <input
                    className="project-inline-edit"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => finishEditProjectName(proj.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishEditProjectName(proj.id);
                      if (e.key === "Escape") setEditingProjectId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="project-name-label"
                    onDoubleClick={(e) => startEditProjectName(e, proj)}
                  >
                    {proj.name}
                  </span>
                )}
              </span>
              <span className="col-assignee"></span>
              <span className="col-location"></span>
              <span className="col-actions">
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(proj.id);
                  }}
                  title="Delete Project"
                >
                  ×
                </button>
              </span>
            </div>
          );
        }

        const task = row.task;
        const depth = row.depth;
        const hasKids = row.hasChildren;
        const isCollapsed = collapsedIds.has(task.id);
        const isMilestone = task.type === "milestone";
        const projectId = row.projectId;

        return (
          <div
            key={task.id}
            className="task-list-row"
            onClick={() => onTaskClick(task, projectId)}
          >
            <span
              className="col-name"
              style={{ paddingLeft: (depth + 1) * 16 }}
            >
              {hasKids ? (
                <span
                  className="tree-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(task.id);
                  }}
                >
                  {isCollapsed ? "▶" : "▼"}
                </span>
              ) : (
                <span className="tree-toggle-placeholder" />
              )}
              <span
                className="task-color-dot"
                style={{ backgroundColor: colorMode ? task.color : "#333333" }}
              />
              {task.name}
            </span>
            <span className="col-assignee">{task.assignee}</span>
            <span className="col-location">{task.location}</span>
            <span className="col-actions">
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id, projectId);
                }}
                title="Delete"
              >
                ×
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
