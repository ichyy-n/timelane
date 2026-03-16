import { useRef, useState } from "react";

const CELL_WIDTH = 80;
const ROW_HEIGHT = 24;
const BAR_HEIGHT = 8;
const SUMMARY_BAR_HEIGHT = 8;

// Compute summary range from children
function getSummaryRange(task, allTasks) {
  const children = allTasks.filter((t) => t.parentId === task.id);
  if (children.length === 0) return null;
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const c of children) {
    if (c.startMonth < minStart) minStart = c.startMonth;
    const end = c.type === "milestone"
      ? (c.dates && c.dates.length > 0 ? Math.max(...c.dates.map(d => d.monthIndex !== undefined ? d.monthIndex : c.startMonth)) : c.startMonth)
      : c.endMonth;
    if (end > maxEnd) maxEnd = end;
  }
  return { startMonth: minStart, endMonth: maxEnd };
}

export default function GanttChart({
  displayRows,
  months,
  onTaskClick,
  onTaskUpdate,
  colorMode = true,
  viewRange,
}) {
  const chartRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const handleMouseDown = (e, task, edge, projectId) => {
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

      onTaskUpdate(task.id, { startMonth: newStart, endMonth: newEnd }, projectId);
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

      {/* Rows */}
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

        {displayRows.map((row, rowIndex) => {
          // Project header row
          if (row.type === "project-header") {
            return (
              <div
                key={`proj-${row.project.id}`}
                className="gantt-row gantt-project-header-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              />
            );
          }

          const task = row.task;
          const projectId = row.projectId;
          const isMilestone = task.type === "milestone";

          // Find all tasks in same project for summary calculation
          const projTasks = displayRows
            .filter((r) => r.type === "task" && r.projectId === projectId)
            .map((r) => r.task);
          // Also need all tasks (not just visible) for summary
          // We'll use the parent lookup from visible + hidden
          const hasKids = row.hasChildren;
          const isSummary = hasKids && !isMilestone;

          if (isMilestone) {
            // Support multi-date milestones via dates array
            const milestoneDates = task.dates && task.dates.length > 0
              ? task.dates
              : [{ date: null, label: "", monthIndex: task.startMonth }];

            // Convert date strings to month indices if needed
            const milestonePoints = milestoneDates.map((d) => {
              if (d.monthIndex !== undefined) return d;
              // Parse "YYYY-MM" to month index relative to view range
              const [year, month] = d.date.split("-").map(Number);
              const startTotal = viewRange.startYear * 12 + viewRange.startMonth;
              const dateTotal = year * 12 + month;
              return { ...d, monthIndex: dateTotal - startTotal };
            });

            const monoColor = !colorMode ? "#333333" : undefined;

            return (
              <div
                key={task.id}
                className="gantt-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                {milestonePoints.map((point, pi) => {
                  const left = point.monthIndex * CELL_WIDTH + CELL_WIDTH / 2 - 5;
                  return (
                    <div key={pi} style={{ position: "absolute", left }}>
                      <div
                        className="milestone-marker"
                        style={monoColor ? { borderTopColor: monoColor } : undefined}
                        onClick={() => onTaskClick(task, projectId)}
                        title={point.label ? `${task.name}: ${point.label}` : task.name}
                      />
                      {point.label && (
                        <span
                          className="milestone-label"
                          style={{
                            position: "absolute",
                            top: 17,
                            left: -10,
                            fontSize: "10px",
                            color: monoColor || "#e63946",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {point.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (isSummary) {
            // Need all project tasks for summary range (not just visible)
            const summaryRange = getSummaryRange(task, projTasks);
            if (summaryRange) {
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
                      backgroundColor: colorMode ? task.color : "#333333",
                    }}
                    onClick={() => onTaskClick(task, projectId)}
                    title={task.name}
                  />
                </div>
              );
            }
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
                  backgroundColor: colorMode ? task.color : "#333333",
                }}
                onClick={() => onTaskClick(task, projectId)}
                title={task.name}
              >
                <div
                  className="bar-handle bar-handle-left"
                  onMouseDown={(e) => handleMouseDown(e, task, "left", projectId)}
                />
                <div
                  className="bar-drag-area"
                  onMouseDown={(e) => handleMouseDown(e, task, "move", projectId)}
                />
                <div
                  className="bar-handle bar-handle-right"
                  onMouseDown={(e) => handleMouseDown(e, task, "right", projectId)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
