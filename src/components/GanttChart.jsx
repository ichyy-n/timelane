import { useRef, useState, useMemo } from "react";

const CELL_WIDTH = 80;
const ROW_HEIGHT = 24;
const NOTES_WIDTH = 160;

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

// Convert a date string to pixel position (month view)
function dateToPixel(dateStr, viewRange, isEnd) {
  const monthIdx = getMonthIndex(dateStr, viewRange);
  const ratio = dayRatio(dateStr, isEnd);
  return (monthIdx + ratio) * CELL_WIDTH;
}

// C2: Generate week labels from viewRange
function getWeekLabels(viewRange) {
  const weeks = [];
  const d = new Date(viewRange.startYear, viewRange.startMonth - 1, 1);
  const end = new Date(viewRange.endYear, viewRange.endMonth, 0);
  // Align to Monday
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset);
  while (d <= end) {
    const monday = new Date(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const label = `${String(monday.getMonth() + 1).padStart(2, "0")}/${String(monday.getDate()).padStart(2, "0")}`;
    weeks.push({
      label,
      startDate: monday.toISOString().split("T")[0],
      endDate: sunday.toISOString().split("T")[0],
    });
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

// C2: Convert a date string to pixel position (week view)
function dateToPixelWeek(dateStr, weeks) {
  const date = new Date(dateStr + "T00:00:00");
  for (let i = 0; i < weeks.length; i++) {
    const wStart = new Date(weeks[i].startDate + "T00:00:00");
    const wEnd = new Date(weeks[i].endDate + "T00:00:00");
    if (date >= wStart && date <= wEnd) {
      const daysSinceStart = (date - wStart) / (1000 * 60 * 60 * 24);
      return (i + daysSinceStart / 7) * CELL_WIDTH;
    }
  }
  // Before first week or after last week: extrapolate
  if (weeks.length === 0) return 0;
  const firstStart = new Date(weeks[0].startDate + "T00:00:00");
  const daysDiff = (date - firstStart) / (1000 * 60 * 60 * 24);
  return (daysDiff / 7) * CELL_WIDTH;
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
  darkMode = false,
  viewRange,
  scrollRef,
  onScroll,
  tasks = [],          // C1: flat list of all tasks (for dependency arrows)
  viewMode = "month",  // C2: 'month' | 'week'
  searchQuery = "",    // C3: filter highlight query
}) {
  const chartRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  // C2: Week labels for week view
  const weekLabels = useMemo(() => {
    if (viewMode !== "week") return [];
    return getWeekLabels(viewRange);
  }, [viewMode, viewRange]);

  // Determine header labels and column count based on viewMode
  const headerLabels = viewMode === "week" ? weekLabels.map((w) => w.label) : months;
  const columnCount = headerLabels.length;

  // C2: Pixel conversion function based on viewMode
  const toPixel = (dateStr, isEnd) => {
    if (viewMode === "week") {
      return dateToPixelWeek(dateStr, weekLabels);
    }
    return dateToPixel(dateStr, viewRange, isEnd);
  };

  // C1: Compute dependency arrow paths
  const arrowPaths = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const paths = [];
    // Build a map of taskId -> rowIndex for visible rows
    const taskRowIndex = new Map();
    displayRows.forEach((row, idx) => {
      if (row.type === "task" && row.task) {
        taskRowIndex.set(row.task.id, idx);
      }
    });
    // Build a map of taskId -> task for coordinate lookup
    const taskMap = new Map();
    tasks.forEach((t) => taskMap.set(t.id, t));

    for (const task of tasks) {
      if (!task.dependencies || task.dependencies.length === 0) continue;
      const depRowIdx = taskRowIndex.get(task.id);
      if (depRowIdx === undefined) continue; // not visible

      for (const depId of task.dependencies) {
        const srcTask = taskMap.get(depId);
        if (!srcTask || !srcTask.endDate) continue;
        const srcRowIdx = taskRowIndex.get(depId);
        if (srcRowIdx === undefined) continue; // source not visible

        const x1 = toPixel(srcTask.endDate, true);
        const x2 = toPixel(task.startDate || srcTask.endDate, false);
        const y1 = srcRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        const y2 = depRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        paths.push({ key: `${depId}->${task.id}`, x1, y1, x2, y2 });
      }
    }
    return paths;
  }, [tasks, displayRows, viewMode, weekLabels, viewRange]);

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

  // Month boundary positions for dashed vertical lines
  const monthBoundaries = useMemo(() => {
    const boundaries = [];
    const { startYear, startMonth, endYear, endMonth } = viewRange;
    // Iterate from second month to last month (boundaries between months)
    let year = startYear;
    let month = startMonth;
    // Skip first boundary (left edge of chart) — start from second month
    for (let i = 1; ; i++) {
      let m = month + i;
      let y = year;
      while (m > 12) { m -= 12; y++; }
      if (y > endYear || (y === endYear && m > endMonth)) break;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-01`;
      const x = toPixel(dateStr, false);
      if (x > 0 && x < columnCount * CELL_WIDTH) {
        boundaries.push({ x, label: `${y}-${String(m).padStart(2, "0")}` });
      }
    }
    return boundaries;
  }, [viewRange, viewMode, weekLabels, columnCount]);

  // B1: Today line position
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPixel = toPixel(todayStr, false);
  const totalWidth = columnCount * CELL_WIDTH;
  const showTodayLine = todayPixel >= 0 && todayPixel <= totalWidth;

  const todayLineStyle = {
    position: 'absolute',
    left: todayPixel,
    top: 0,
    bottom: 0,
    width: 2,
    background: '#ef4444',
    pointerEvents: 'none',
    zIndex: 10,
  };

  return (
    <div className="gantt-chart" ref={chartRef}>
      {/* Headers (month or week) */}
      <div className="gantt-header" style={{ width: columnCount * CELL_WIDTH + NOTES_WIDTH, position: 'relative' }}>
        {headerLabels.map((label, i) => (
          <div
            key={i}
            className="gantt-header-cell"
            style={{ width: CELL_WIDTH }}
          >
            {label}
          </div>
        ))}
        <div className="gantt-header-cell gantt-notes-header" style={{ width: NOTES_WIDTH }}>
          備考
        </div>
        {/* Month boundary dashed lines in header */}
        {monthBoundaries.map((b, i) => (
          <div key={`mb-h-${i}`} style={{
            position: 'absolute',
            left: b.x,
            top: 0,
            bottom: 0,
            width: 0,
            borderLeft: '1px dashed rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 5,
          }} />
        ))}
        {/* B1: Today line in header */}
        {showTodayLine && <div style={todayLineStyle} />}
      </div>

      {/* Rows */}
      <div
        className="gantt-body"
        style={{ width: columnCount * CELL_WIDTH + NOTES_WIDTH, height: displayRows.length * ROW_HEIGHT, position: 'relative' }}
        ref={scrollRef}
        onScroll={onScroll}
      >
        {/* Grid lines */}
        <div className="gantt-grid">
          {headerLabels.map((_, i) => (
            <div
              key={i}
              className="gantt-grid-col"
              style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }}
            />
          ))}
        </div>

        {/* C1: SVG dependency arrows overlay */}
        {arrowPaths.length > 0 && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            {arrowPaths.map(({ key, x1, y1, x2, y2 }) => (
              <g key={key}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrow)" />
              </g>
            ))}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
              </marker>
            </defs>
          </svg>
        )}

        {/* Month boundary dashed lines in body */}
        {monthBoundaries.map((b, i) => (
          <div key={`mb-b-${i}`} style={{
            position: 'absolute',
            left: b.x,
            top: 0,
            bottom: 0,
            width: 0,
            borderLeft: '1px dashed rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 5,
          }} />
        ))}
        {/* B1: Today line in body */}
        {showTodayLine && <div style={todayLineStyle} />}

        {displayRows.map((row, rowIndex) => {
          // Project header row
          if (row.type === "project-header") {
            return (
              <div
                key={`proj-${row.project.id}`}
                className="gantt-row gantt-project-header-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <div className="gantt-notes-cell" style={{ left: columnCount * CELL_WIDTH, width: NOTES_WIDTH }} />
              </div>
            );
          }

          const task = row.task;
          const projectId = row.projectId;
          const isMilestone = task.type === "milestone";
          const notesCell = (
            <div className="gantt-notes-cell" style={{ left: columnCount * CELL_WIDTH, width: NOTES_WIDTH }} title={task.notes || ""}>
              {task.notes || ""}
            </div>
          );

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
                >
                  {notesCell}
                </div>
              );
            }

            const monoColor = !colorMode ? (darkMode ? "#cccccc" : "#333333") : undefined;

            return (
              <div
                key={task.id}
                className="gantt-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                {milestoneDates.map((point, pi) => {
                  const px = toPixel(point.date, false);
                  const left = px - 5;
                  return (
                    <div key={pi} style={{ position: "absolute", left }}>
                      <div
                        className="milestone-marker"
                        style={monoColor ? { borderTopColor: monoColor } : undefined}
                        onClick={() => onTaskClick(task, projectId)}
                        title={point.label ? `${task.name}: ${point.label}` : task.name}
                      />
                    </div>
                  );
                })}
                {notesCell}
              </div>
            );
          }

          if (isSummary) {
            // Only show summary bar if parent task has its own dates set
            const summaryRange = (task.startDate || task.endDate) ? getSummaryDateRange(task, projTasks) : null;
            if (summaryRange) {
              const sLeft = toPixel(summaryRange.startDate, false);
              const sRight = toPixel(summaryRange.endDate, true);
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
                      backgroundColor: colorMode ? task.color : (darkMode ? "#cccccc" : "#333333"),
                    }}
                    onClick={() => onTaskClick(task, projectId)}
                    title={task.name}
                  />
                  {notesCell}
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
              >
                {notesCell}
              </div>
            );
          }

          const left = toPixel(task.startDate, false);
          const right = toPixel(task.endDate, true);
          const width = right - left;

          // C3: Dim non-matching tasks when searchQuery is active
          const isMatch = !searchQuery || (task.name && task.name.toLowerCase().includes(searchQuery.toLowerCase()));
          const rowOpacity = searchQuery && !isMatch ? 0.3 : 1;

          return (
            <div
              key={task.id}
              className="gantt-row"
              style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, opacity: rowOpacity }}
            >
              <div
                className="gantt-bar"
                style={{
                  left: left,
                  width: Math.max(width, 20),
                  backgroundColor: colorMode ? task.color : (darkMode ? "#cccccc" : "#333333"),
                }}
                onClick={() => onTaskClick(task, projectId)}
                title={task.name}
              >
                {/* B4: Progress overlay */}
                {task.progress > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${task.progress}%`,
                    background: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                  }} />
                )}
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
              {notesCell}
            </div>
          );
        })}
      </div>
    </div>
  );
}
