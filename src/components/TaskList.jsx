import { useState } from "react";

const STATUS_COLORS = {
  not_started: "#b4b0a8",
  in_progress: "#2eaadc",
  done: "#4dab9a",
};

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
  collapsedGroups = new Set(),
  onToggleGroupCollapse,
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
        if (row.type === "group-header") {
          const isCollapsed = collapsedGroups.has(row.groupKey);
          return (
            <div
              key={`group-${row.groupKey}`}
              className="task-list-row group-header-row"
              onClick={() => onToggleGroupCollapse && onToggleGroupCollapse(row.groupKey)}
            >
              <span className="col-name group-header-name">
                <span className="tree-toggle">
                  {isCollapsed ? "▶" : "▼"}
                </span>
                <span className="group-header-label">{row.groupKey}</span>
                <span className="group-header-count">{row.count}</span>
              </span>
              <span className="col-assignee"></span>
              <span className="col-location"></span>
              <span className="col-actions"></span>
            </div>
          );
        }

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
                  <>
                    <span
                      className="project-name-label"
                      onDoubleClick={(e) => startEditProjectName(e, proj)}
                    >
                      {proj.name}
                    </span>
                    <span
                      className="edit-icon"
                      onClick={(e) => startEditProjectName(e, proj)}
                      title="プロジェクト名を編集"
                    >
                      ✏
                    </span>
                  </>
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

        return (
          <div
            key={task.id}
            className={`task-list-row${draggedItem?.taskId === task.id ? " dragging" : ""}`}
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
              <span
                className="task-status-dot"
                style={{ backgroundColor: STATUS_COLORS[task.status || "not_started"] }}
                title={task.status === "done" ? "完了" : task.status === "in_progress" ? "進行中" : "未着手"}
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
