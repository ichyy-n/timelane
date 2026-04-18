import { useRef, useState, useMemo } from "react";
import { TODAY_LINE_COLOR, ARROW_COLORS, TASK_NAME_COLORS } from "./theme";

const CELL_WIDTH = 80;
const ROW_HEIGHT = 32;
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

// C3: Generate quarter labels from viewRange
function getQuarterLabels(viewRange) {
  const quarters = [];
  let y = viewRange.startYear;
  let m = viewRange.startMonth;
  // Align to quarter start
  const qStart = Math.ceil(m / 3);
  let q = qStart;
  while (y < viewRange.endYear || (y === viewRange.endYear && (q - 1) * 3 + 1 <= viewRange.endMonth)) {
    quarters.push({
      label: `Q${q} ${y}`,
      year: y,
      quarter: q,
      startDate: `${y}-${String((q - 1) * 3 + 1).padStart(2, "0")}-01`,
    });
    q++;
    if (q > 4) { q = 1; y++; }
  }
  return quarters;
}

// C3: Convert a date string to pixel position (quarter view)
const QUARTER_CELL_WIDTH = 80;
function dateToPixelQuarter(dateStr, quarters) {
  if (quarters.length === 0) return 0;
  const date = new Date(dateStr + "T00:00:00");
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const q = Math.ceil(month / 3);
  const qStartMonth = (q - 1) * 3 + 1;
  // Days in this quarter
  let totalDays = 0;
  for (let mi = qStartMonth; mi < qStartMonth + 3; mi++) {
    totalDays += new Date(year, mi, 0).getDate();
  }
  // Days elapsed in this quarter
  let daysElapsed = 0;
  for (let mi = qStartMonth; mi < month; mi++) {
    daysElapsed += new Date(year, mi, 0).getDate();
  }
  daysElapsed += day - 1;
  const ratio = daysElapsed / totalDays;

  // Find quarter index
  const qIdx = quarters.findIndex((qi) => qi.year === year && qi.quarter === q);
  if (qIdx >= 0) {
    return (qIdx + ratio) * QUARTER_CELL_WIDTH;
  }
  // Extrapolate
  const firstQ = quarters[0];
  const firstQNum = (firstQ.year * 4) + firstQ.quarter;
  const thisQNum = (year * 4) + q;
  return ((thisQNum - firstQNum) + ratio) * QUARTER_CELL_WIDTH;
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
  viewMode = "month",  // C2: 'month' | 'week' | 'quarter'
}) {
  const chartRef = useRef(null);
  const [, setDragging] = useState(null);

  // C2: Week labels for week view
  const weekLabels = useMemo(() => {
    if (viewMode !== "week") return [];
    return getWeekLabels(viewRange);
  }, [viewMode, viewRange]);

  // C3: Quarter labels for quarter view
  const quarterLabels = useMemo(() => {
    if (viewMode !== "quarter") return [];
    return getQuarterLabels(viewRange);
  }, [viewMode, viewRange]);

  // Determine header labels and column count based on viewMode
  const headerLabels = viewMode === "week"
    ? weekLabels.map((w) => w.label)
    : viewMode === "quarter"
      ? quarterLabels.map((q) => q.label)
      : months;
  const columnCount = headerLabels.length;
  const cellWidth = viewMode === "quarter" ? QUARTER_CELL_WIDTH : CELL_WIDTH;

  // C2/C3: Pixel conversion function based on viewMode
  const toPixel = (dateStr, isEnd) => {
    if (viewMode === "week") {
      return dateToPixelWeek(dateStr, weekLabels);
    }
    if (viewMode === "quarter") {
      return dateToPixelQuarter(dateStr, quarterLabels);
    }
    return dateToPixel(dateStr, viewRange, isEnd);
  };

  // C1: Compute dependency arrow paths with collision detection
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

        // Collision: successor starts before predecessor ends
        const hasCollision = task.startDate && srcTask.endDate && task.startDate < srcTask.endDate;

        paths.push({ key: `${depId}->${task.id}`, x1, y1, x2, y2, hasCollision });
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
      // Approximate days per cell based on viewMode
      const daysPerCell = viewMode === "quarter" ? 91 : viewMode === "week" ? 7 : 30;
      const dayDelta = Math.round((dx / cellWidth) * daysPerCell);
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

  // Boundary positions for dashed vertical lines
  const monthBoundaries = useMemo(() => {
    const boundaries = [];
    if (viewMode === "week" || viewMode === "quarter") {
      // Week/Quarter view: draw lines at each cell boundary
      for (let i = 1; i < columnCount; i++) {
        const x = i * cellWidth;
        boundaries.push({ x, label: headerLabels[i] || "" });
      }
    } else {
      // Month view: draw lines at month boundaries (1st of each month)
      const { startYear, startMonth, endYear, endMonth } = viewRange;
      let year = startYear;
      let month = startMonth;
      for (let i = 1; ; i++) {
        let m = month + i;
        let y = year;
        while (m > 12) { m -= 12; y++; }
        if (y > endYear || (y === endYear && m > endMonth)) break;
        const dateStr = `${y}-${String(m).padStart(2, "0")}-01`;
        const x = toPixel(dateStr, false);
        if (x > 0 && x < columnCount * cellWidth) {
          boundaries.push({ x, label: `${y}-${String(m).padStart(2, "0")}` });
        }
      }
    }
    return boundaries;
  }, [viewRange, viewMode, weekLabels, quarterLabels, columnCount, cellWidth]);

  // B1: Today line position
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPixel = toPixel(todayStr, false);
  const totalWidth = columnCount * cellWidth;
  const showTodayLine = todayPixel >= 0 && todayPixel <= totalWidth;

  const todayLineStyle = {
    position: 'absolute',
    left: todayPixel,
    top: 0,
    bottom: 0,
    width: 2,
    background: TODAY_LINE_COLOR,
    pointerEvents: 'none',
    zIndex: 10,
  };

  return (
    <div className="gantt-chart" ref={chartRef}>
      {/* Headers (month or week) */}
      <div className="gantt-header" style={{ width: columnCount * cellWidth + NOTES_WIDTH, position: 'relative' }}>
        {headerLabels.map((label, i) => (
          <div
            key={i}
            className="gantt-header-cell"
            style={{ width: cellWidth }}
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
        style={{ width: columnCount * cellWidth + NOTES_WIDTH, height: displayRows.length * ROW_HEIGHT, position: 'relative' }}
        ref={scrollRef}
        onScroll={onScroll}
      >
        {/* Grid lines */}
        <div className="gantt-grid">
          {headerLabels.map((_, i) => (
            <div
              key={i}
              className="gantt-grid-col"
              style={{ left: i * cellWidth, width: cellWidth }}
            />
          ))}
        </div>

        {/* C1: SVG dependency arrows overlay (bezier curves) */}
        {arrowPaths.length > 0 && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            <defs>
              <marker id="arrow-normal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={ARROW_COLORS.default} />
              </marker>
              <marker id="arrow-collision" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={ARROW_COLORS.collision} />
              </marker>
            </defs>
            {arrowPaths.map(({ key, x1, y1, x2, y2, hasCollision }) => {
              const dx = Math.abs(x2 - x1);
              const cpOffset = Math.max(dx * 0.4, 20);
              const d = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`;
              const color = hasCollision ? ARROW_COLORS.collision : ARROW_COLORS.default;
              const markerId = hasCollision ? 'arrow-collision' : 'arrow-normal';
              return (
                <path key={key} d={d} stroke={color} strokeWidth="1.5" fill="none" markerEnd={`url(#${markerId})`} />
              );
            })}
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
          // Group header row
          if (row.type === "group-header") {
            return (
              <div
                key={`group-${row.groupKey}`}
                className="gantt-row gantt-group-header-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <div className="gantt-notes-cell" style={{ left: columnCount * cellWidth, width: NOTES_WIDTH }} />
              </div>
            );
          }

          // Project header row
          if (row.type === "project-header") {
            return (
              <div
                key={`proj-${row.project.id}`}
                className="gantt-row gantt-project-header-row"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <div className="gantt-notes-cell" style={{ left: columnCount * cellWidth, width: NOTES_WIDTH }} />
              </div>
            );
          }

          const task = row.task;
          const projectId = row.projectId;
          const isMilestone = task.type === "milestone";
          const notesCell = (
            <div className="gantt-notes-cell" style={{ left: columnCount * cellWidth, width: NOTES_WIDTH }} title={task.notes || ""}>
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

            const monoColor = !colorMode ? (darkMode ? TASK_NAME_COLORS.dark : TASK_NAME_COLORS.light) : undefined;

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
                      backgroundColor: colorMode ? task.color : (darkMode ? TASK_NAME_COLORS.dark : TASK_NAME_COLORS.light),
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
                  backgroundColor: colorMode ? task.color : (darkMode ? TASK_NAME_COLORS.dark : TASK_NAME_COLORS.light),
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
                {/* C4: Task name on bar */}
                {Math.max(width, 20) >= 60 && (
                  <span className="bar-label">{task.name}</span>
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
