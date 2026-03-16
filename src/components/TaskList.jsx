export default function TaskList({ tasks, onTaskClick, onDelete }) {
  return (
    <div className="task-list">
      <div className="task-list-header">
        <span className="col-name">Task</span>
        <span className="col-assignee">Assignee</span>
        <span className="col-location">Location</span>
        <span className="col-actions"></span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="task-list-row"
          onClick={() => onTaskClick(task)}
        >
          <span className="col-name">
            <span
              className="task-color-dot"
              style={{ backgroundColor: task.color }}
            />
            {task.isMilestone ? "◆ " : ""}
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
      ))}
    </div>
  );
}
