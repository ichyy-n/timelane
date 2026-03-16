import { useRef, useState } from "react";

const CELL_WIDTH = 80;
const ROW_HEIGHT = 36;

// Compute summary range from children
function getSummaryRange(task, allTasks) {
  const children = allTasks.filter((t) => t.parentId === task.id);
  if (children.length === 0) return null;
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const c of children) {
    if (c.startMonth < minStart) minStart = c.startMonth;
    const end = c.type === "milestone" ? c.startMonth : c.endMonth;
    if (end > maxEnd) maxEnd = end;
  }
  return { startMonth: minStart, endMonth: maxEnd };
}

export default function GanttChart({
  tasks,
  allTasks,
  months,
  onTaskClick,
  onTaskUpdate,
}) {
  const chartRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const handleMouseDown = (e, task, edge) => {
    e.stopPropagation();
    const startX = e.clientX;
    setDragging({ taskId: task.id, edge, startX, origStart: task.startMonth, origEnd: task.endMonth });

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const monthDelta = Math.round(dx / CELL_WIDTH);
      if (monthDelta === 0) return;

      let newStart = task.startMonth;
      let newEnd = task.endMonth;

      if (edge === "move") {
        newStart = task.startMonth + monthDelta;
        newEnd = task.endMonth + monthDelta;
      } else if (edge === "left") {
        newStart = task.startMonth + monthDelta;
      } else if (edge === "right") {
        newEnd = task.endMonth + monthDelta;
      }

      if (newStart < 0) newStart = 0;
      if (newEnd >= months.length) newEnd = months.length - 1;
      if (newStart > newEnd) return;

      onTaskUpdate(task.id, { startMonth: newStart, endMonth: newEnd });
    };

    const handleMouseUp = () => {
      setDragging(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="gantt-chart" ref={chartRef}>
      {/* Month headers */}
      <div className="gantt-header" style={{ width: months.length * CELL_WIDTH }}>
        {months.map((label, i) => (
          <div
            key={i}
            className="gantt-header-cell"
            style={{ width: CELL_WIDTH }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Task rows */}
      <div className="gantt-body" style={{ width: months.length * CELL_WIDTH }}>
        {/* Grid lines */}
        <div className="gantt-grid">
          {months.map((_, i) => (
            <div
              key={i}
              className="gantt-grid-col"
              style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }}
            />
          ))}
        </div>

        {tasks.map((task, rowIndex) => {
          const isMilestone = task.type === "milestone";
          const hasKids = allTasks.some((t) => t.parentId === task.id);
          const isSummary = hasKids && !isMilestone;
          const summaryRange = isSummary ? getSummaryRange(task, allTasks) : null;

          if (isMilestone) {
            const left = task.startMonth * CELL_WIDTH + CELL_WIDTH / 2 - 8;
            return (
              <div
                key={task.id}
                className="gantt-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <div
                  className="milestone-marker"
                  style={{ left }}
                  onClick={() => onTaskClick(task)}
                  title={task.name}
                />
              </div>
            );
          }

          // Summary bar for parent tasks with children
          if (isSummary && summaryRange) {
            const sLeft = summaryRange.startMonth * CELL_WIDTH + 2;
            const sWidth = (summaryRange.endMonth - summaryRange.startMonth + 1) * CELL_WIDTH - 4;

            return (
              <div
                key={task.id}
                className="gantt-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <div
                  className="gantt-bar summary-bar"
                  style={{
                    left: sLeft,
                    width: Math.max(sWidth, 20),
                    backgroundColor: task.color,
                  }}
                  onClick={() => onTaskClick(task)}
                  title={task.name}
                >
                  <div className="bar-label">
                    {sWidth > 60 ? task.name : ""}
                  </div>
                </div>
              </div>
            );
          }

          // Normal task bar
          const left = task.startMonth * CELL_WIDTH;
          const width = (task.endMonth - task.startMonth + 1) * CELL_WIDTH - 4;

          return (
            <div
              key={task.id}
              className="gantt-row"
              style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              <div
                className="gantt-bar"
                style={{
                  left: left + 2,
                  width: Math.max(width, 20),
                  backgroundColor: task.color,
                }}
                onClick={() => onTaskClick(task)}
                title={task.name}
              >
                <div
                  className="bar-handle bar-handle-left"
                  onMouseDown={(e) => handleMouseDown(e, task, "left")}
                />
                <div
                  className="bar-label"
                  onMouseDown={(e) => handleMouseDown(e, task, "move")}
                >
                  {width > 60 ? task.name : ""}
                </div>
                <div
                  className="bar-handle bar-handle-right"
                  onMouseDown={(e) => handleMouseDown(e, task, "right")}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
