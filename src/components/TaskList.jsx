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
  onReorder,
  colorMode = true,
  searchQuery = "",  // C3: filter highlight query
}) {
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editName, setEditName] = useState("");
  // B3: Drag state
  const [draggedItem, setDraggedItem] = useState(null);

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
        <span className="col-name">タスク名</span>
        <span className="col-assignee">担当者</span>
        <span className="col-location">場所</span>
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
                  title="プロジェクトを削除"
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

        // C3: Dim non-matching tasks when searchQuery is active
        const isMatch = !searchQuery || (task.name && task.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const rowOpacity = searchQuery && !isMatch ? 0.3 : 1;

        return (
          <div
            key={task.id}
            className={`task-list-row${draggedItem?.taskId === task.id ? " dragging" : ""}`}
            style={{ opacity: rowOpacity }}
            onClick={() => onTaskClick(task, projectId)}
            draggable
            onDragStart={(e) => {
              setDraggedItem({ taskId: task.id, projectId });
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDraggedItem(null)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedItem && draggedItem.taskId !== task.id) {
                onReorder(draggedItem, { taskId: task.id, projectId });
              }
              setDraggedItem(null);
            }}
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
                title="タスクを削除"
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
