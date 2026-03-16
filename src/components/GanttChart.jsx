import { useRef, useState } from "react";

const CELL_WIDTH = 80;
const ROW_HEIGHT = 24;

// Get month index (0-based) relative to viewRange start
function getMonthIndex(dateStr, viewRange) {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return (year - viewRange.startYear) * 12 + (month - viewRange.startMonth);
}

// Day ratio within its month (0.0 to 1.0)
function dayRatio(dateStr, isEnd) {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (isEnd) {
    return day / daysInMonth;
  }
  return (day - 1) / daysInMonth;
}

// Convert a date string to pixel position
function dateToPixel(dateStr, viewRange, isEnd) {
  const monthIdx = getMonthIndex(dateStr, viewRange);
  const ratio = dayRatio(dateStr, isEnd);
  return (monthIdx + ratio) * CELL_WIDTH;
}

// Add days to a date string, return YYYY-MM-DD
function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Compute summary date range from children
function getSummaryDateRange(task, allTasks) {
  const children = allTasks.filter((t) => t.parentId === task.id);
  if (children.length === 0) return null;
  let minDate = null;
  let maxDate = null;
  for (const c of children) {
    const cStart = c.startDate;
    const cEnd =
      c.type === "milestone"
        ? c.dates && c.dates.length > 0
          ? c.dates.reduce((max, d) => (d.date > max ? d.date : max), c.dates[0].date)
          : cStart
        : c.endDate;
    if (!cStart && !cEnd) continue;
    if (cStart && (!minDate || cStart < minDate)) minDate = cStart;
    if (cEnd && (!maxDate || cEnd > maxDate)) maxDate = cEnd;
  }
  return minDate && maxDate ? { startDate: minDate, endDate: maxDate } : null;
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
    const origStartDate = task.startDate;
    const origEndDate = task.endDate;
    setDragging({ taskId: task.id, edge, startX });

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      // Approximate: 1 month cell = ~30 days
      const dayDelta = Math.round((dx / CELL_WIDTH) * 30);
      if (dayDelta === 0) return;

      let newStart = origStartDate;
      let newEnd = origEndDate;

      if (edge === "move") {
        newStart = addDays(origStartDate, dayDelta);
        newEnd = addDays(origEndDate, dayDelta);
      } else if (edge === "left") {
        newStart = addDays(origStartDate, dayDelta);
        if (newStart > origEndDate) return;
      } else if (edge === "right") {
        newEnd = addDays(origEndDate, dayDelta);
        if (newEnd < origStartDate) return;
      }

      onTaskUpdate(task.id, { startDate: newStart, endDate: newEnd }, projectId);
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
          const hasKids = row.hasChildren;
          const isSummary = hasKids && !isMilestone;

          if (isMilestone) {
            const milestoneDates =
              task.dates && task.dates.length > 0
                ? task.dates
                : task.startDate
                  ? [{ date: task.startDate, label: "" }]
                  : [];

            if (milestoneDates.length === 0) {
              return (
                <div
                  key={task.id}
                  className="gantt-row"
                  style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              );
            }

            const monoColor = !colorMode ? "#333333" : undefined;

            return (
              <div
                key={task.id}
                className="gantt-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                {milestoneDates.map((point, pi) => {
                  const px = dateToPixel(point.date, viewRange, false);
                  const left = px - 5;
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
            const summaryRange = getSummaryDateRange(task, projTasks);
            if (summaryRange) {
              const sLeft = dateToPixel(summaryRange.startDate, viewRange, false);
              const sRight = dateToPixel(summaryRange.endDate, viewRange, true);
              const sWidth = sRight - sLeft;
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

          // Normal task bar — skip if dates are missing
          if (!task.startDate || !task.endDate) {
            return (
              <div
                key={task.id}
                className="gantt-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              />
            );
          }

          const left = dateToPixel(task.startDate, viewRange, false);
          const right = dateToPixel(task.endDate, viewRange, true);
          const width = right - left;

          return (
            <div
              key={task.id}
              className="gantt-row"
              style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              <div
                className="gantt-bar"
                style={{
                  left: left,
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
