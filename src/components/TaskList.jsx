export default function TaskList({
  tasks,
  allTasks,
  depthMap,
  collapsedIds,
  onToggleCollapse,
  onTaskClick,
  onDelete,
}) {
  const hasChildTasks = (taskId) => allTasks.some((t) => t.parentId === taskId);

  return (
    <div className="task-list">
      <div className="task-list-header">
        <span className="col-name">Task</span>
        <span className="col-assignee">Assignee</span>
        <span className="col-location">Location</span>
        <span className="col-actions"></span>
      </div>
      {tasks.map((task) => {
        const depth = depthMap.get(task.id) || 0;
        const hasKids = hasChildTasks(task.id);
        const isCollapsed = collapsedIds.has(task.id);
        const isMilestone = task.type === "milestone";

        return (
          <div
            key={task.id}
            className="task-list-row"
            onClick={() => onTaskClick(task)}
          >
            <span
              className="col-name"
              style={{ paddingLeft: depth * 20 }}
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
                style={{ backgroundColor: task.color }}
              />
              {isMilestone ? "◆ " : ""}
              {task.name}
            </span>
            <span className="col-assignee">{task.assignee}</span>
            <span className="col-location">{task.location}</span>
            <span className="col-actions">
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
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
