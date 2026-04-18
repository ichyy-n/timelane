import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Toolbar from "./components/Toolbar";
import TaskList from "./components/TaskList";
import GanttChart from "./components/GanttChart";
import TaskModal from "./components/TaskModal";
import { generateProjectId } from "./data/sampleData";
import { exportToExcel } from "./utils/exportExcel";
import { useTimelaneTasks } from "./hooks/useTimelaneTasks";
import "./App.css";

function getMonthLabels(startYear, startMonth, endYear, endMonth) {
  const labels = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    labels.push(`${y}/${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return labels;
}

// Build tree-ordered flat list
function buildTreeOrder(tasks) {
  const childMap = new Map();
  tasks.forEach((t) => {
    const pid = t.parentId || "__root__";
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid).push(t);
  });

  const result = [];
  const depthMap = new Map();

  function walk(parentId, depth) {
    const children = childMap.get(parentId) || [];
    for (const task of children) {
      result.push(task);
      depthMap.set(task.id, depth);
      walk(task.id, depth + 1);
    }
  }
  walk("__root__", 0);
  return { ordered: result, depthMap };
}

// Get all descendant IDs of a task
function getDescendantIds(tasks, parentId) {
  const ids = new Set();
  const childMap = new Map();
  tasks.forEach((t) => {
    const pid = t.parentId || "__root__";
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid).push(t);
  });
  function walk(pid) {
    const children = childMap.get(pid) || [];
    for (const c of children) {
      ids.add(c.id);
      walk(c.id);
    }
  }
  walk(parentId);
  return ids;
}

// A3: Dynamic viewRange initial value
function computeDefaultViewRange() {
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + 1;
  let endMonth = startMonth + 12;
  let endYear = startYear;
  if (endMonth > 12) { endMonth -= 12; endYear += 1; }
  return { startYear, startMonth, endYear, endMonth };
}

// A2: History constants
const MAX_HISTORY = 50;

function App() {
  // History bookkeeping must be declared before the hook so its callback ref is stable.
  const historyRef = useRef({ stack: [], index: -1 });
  const isUndoRedoRef = useRef(false);

  const recordHistory = useCallback((next) => {
    if (isUndoRedoRef.current) return;
    const h = historyRef.current;
    const newStack = h.stack.slice(0, h.index + 1);
    newStack.push(next);
    if (newStack.length > MAX_HISTORY) newStack.shift();
    historyRef.current = { stack: newStack, index: newStack.length - 1 };
  }, []);

  const {
    projects,
    setProjects,
    addTask,
    editTask,
    deleteTask,
    saveJson,
    loadJson,
  } = useTimelaneTasks([], { onChange: recordHistory });

  const [modalState, setModalState] = useState({ open: false, task: null, projectId: null });
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [colorMode, setColorMode] = useState(true);
  const [viewRange, setViewRange] = useState(computeDefaultViewRange);

  // B2: Scroll sync refs
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const isSyncingRef = useRef(false);

  // C2: viewMode state
  const [viewMode, setViewMode] = useState('month');

  // Sort mode state
  const [sortMode, setSortMode] = useState('manual');

  // Dark mode state (independent of colorMode)
  const [darkMode, setDarkMode] = useState(false);

  // Filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterState, setFilterState] = useState({ assignees: [], locations: [] });

  // Group state
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'assignee' | 'location'
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());


  // Apply dark mode to document body
  useEffect(() => {
    if (darkMode) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }, [darkMode]);

  // B5: Inline project creation
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // A2: Initialize history
  useEffect(() => {
    historyRef.current = { stack: [projects], index: 0 };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // setProjects already routes through recordHistory via the hook's onChange.
  // Keep the alias so existing call sites stay legible.
  const setProjectsWithHistory = setProjects;

  // A2: Undo/Redo keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const h = historyRef.current;
        if (h.index > 0) {
          h.index -= 1;
          isUndoRedoRef.current = true;
          setProjects(h.stack[h.index]);
          setTimeout(() => { isUndoRedoRef.current = false; }, 0);
        }
      }
      if (isMod && ((e.key === "z" && e.shiftKey) || (e.key === "y"))) {
        e.preventDefault();
        const h = historyRef.current;
        if (h.index < h.stack.length - 1) {
          h.index += 1;
          isUndoRedoRef.current = true;
          setProjects(h.stack[h.index]);
          setTimeout(() => { isUndoRedoRef.current = false; }, 0);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setProjects]);

  // A1: Electron auto-save - load on mount
  useEffect(() => {
    window.electronAPI?.loadData().then((data) => {
      if (data && data.projects) {
        isUndoRedoRef.current = true;
        setProjects(data.projects);
        if (data.viewRange) setViewRange(data.viewRange);
        if (data.colorMode !== undefined) setColorMode(data.colorMode);
        if (data.darkMode !== undefined) setDarkMode(data.darkMode);
        setTimeout(() => {
          isUndoRedoRef.current = false;
          historyRef.current = { stack: [data.projects], index: 0 };
        }, 0);
      }
    }).catch(() => { /* not in Electron, ignore */ });
  }, [setProjects]);

  // A1: Debounced auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      window.electronAPI?.saveData({ version: "2.0", projects, viewRange, colorMode, darkMode });
    }, 1000);
    return () => clearTimeout(timer);
  }, [projects, viewRange, colorMode, darkMode]);

  // B2: Scroll sync handler
  const syncScroll = useCallback((source) => (e) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const target = source === "left" ? rightPanelRef.current : leftPanelRef.current;
    if (target) target.scrollTop = e.currentTarget.scrollTop;
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  // Scroll to today's position in the right panel
  const handleScrollToToday = useCallback(() => {
    if (!rightPanelRef.current) return;
    const today = new Date();
    const CELL_WIDTH = 80;

    let px;
    if (viewMode === 'week') {
      // Approximate week-based position
      const startDate = new Date(viewRange.startYear, viewRange.startMonth - 1, 1);
      const daysDiff = (today - startDate) / (1000 * 60 * 60 * 24);
      px = (daysDiff / 7) * CELL_WIDTH;
    } else if (viewMode === 'quarter') {
      const startQ = Math.ceil(viewRange.startMonth / 3);
      const startQNum = viewRange.startYear * 4 + startQ;
      const todayQ = Math.ceil((today.getMonth() + 1) / 3);
      const todayQNum = today.getFullYear() * 4 + todayQ;
      const qStartMonth = (todayQ - 1) * 3 + 1;
      let totalDays = 0;
      for (let mi = qStartMonth; mi < qStartMonth + 3; mi++) {
        totalDays += new Date(today.getFullYear(), mi, 0).getDate();
      }
      let daysElapsed = 0;
      for (let mi = qStartMonth; mi < today.getMonth() + 1; mi++) {
        daysElapsed += new Date(today.getFullYear(), mi, 0).getDate();
      }
      daysElapsed += today.getDate() - 1;
      const ratio = daysElapsed / totalDays;
      px = ((todayQNum - startQNum) + ratio) * CELL_WIDTH;
    } else {
      // Month view
      const monthIdx = (today.getFullYear() - viewRange.startYear) * 12 + (today.getMonth() + 1 - viewRange.startMonth);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const ratio = (today.getDate() - 1) / daysInMonth;
      px = (monthIdx + ratio) * CELL_WIDTH;
    }

    const panelWidth = rightPanelRef.current.clientWidth;
    rightPanelRef.current.scrollTo({ left: px - panelWidth / 2, behavior: 'smooth' });
  }, [viewMode, viewRange]);

  const months = useMemo(
    () => getMonthLabels(viewRange.startYear, viewRange.startMonth, viewRange.endYear, viewRange.endMonth),
    [viewRange]
  );

  // Collect unique filter options from all tasks
  const filterOptions = useMemo(() => {
    const assignees = new Set();
    const locations = new Set();
    for (const proj of projects) {
      for (const t of proj.tasks) {
        if (t.assignee) assignees.add(t.assignee);
        if (t.location) locations.add(t.location);
      }
    }
    return {
      assignees: [...assignees].sort(),
      locations: [...locations].sort(),
    };
  }, [projects]);

  // Check if any filter is active
  const isFilterActive = filterState.assignees.length > 0 || filterState.locations.length > 0;

  // Build display rows with filter and grouping support
  const displayRows = useMemo(() => {
    // Helper: filter tasks
    const applyFilter = (tasks) => {
      if (!isFilterActive) return tasks;
      return tasks.filter((t) => {
        const matchAssignee = filterState.assignees.length === 0 || filterState.assignees.includes(t.assignee || '');
        const matchLocation = filterState.locations.length === 0 || filterState.locations.includes(t.location || '');
        return matchAssignee && matchLocation;
      });
    };

    // Helper: sort tasks
    const applySort = (tasks) => {
      if (sortMode === 'manual') return tasks;
      return [...tasks].sort((a, b) => {
        if (sortMode === 'startDate') return (a.startDate || '').localeCompare(b.startDate || '');
        if (sortMode === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortMode === 'assignee') return (a.assignee || '').localeCompare(b.assignee || '');
        return 0;
      });
    };

    // Helper: build task rows from a list of tasks
    const buildTaskRows = (tasks, projectId) => {
      const rows = [];
      const { ordered, depthMap } = buildTreeOrder(tasks);
      const hidden = new Set();
      for (const id of collapsedIds) {
        const descs = getDescendantIds(tasks, id);
        descs.forEach((d) => hidden.add(d));
      }
      for (const task of ordered) {
        if (!hidden.has(task.id)) {
          rows.push({
            type: "task",
            task,
            projectId,
            depth: depthMap.get(task.id) || 0,
            hasChildren: tasks.some((t) => t.parentId === task.id),
          });
        }
      }
      return rows;
    };

    // Grouping mode
    if (groupBy !== 'none') {
      const rows = [];
      // Collect all tasks across projects, filtered and sorted
      const allFiltered = [];
      for (const proj of projects) {
        const filtered = applyFilter(proj.tasks);
        const sorted = applySort(filtered);
        for (const t of sorted) {
          allFiltered.push({ task: t, projectId: proj.id });
        }
      }

      // Group by field
      const groups = new Map();
      for (const { task, projectId } of allFiltered) {
        const key = (groupBy === 'assignee' ? task.assignee : task.location) || '（未設定）';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ task, projectId });
      }

      // Sort group keys
      const sortedKeys = [...groups.keys()].sort((a, b) => {
        if (a === '（未設定）') return 1;
        if (b === '（未設定）') return -1;
        return a.localeCompare(b);
      });

      for (const key of sortedKeys) {
        const items = groups.get(key);
        rows.push({
          type: "group-header",
          groupKey: key,
          groupBy,
          count: items.length,
        });
        if (!collapsedGroups.has(key)) {
          for (const { task, projectId } of items) {
            rows.push({
              type: "task",
              task,
              projectId,
              depth: 0,
              hasChildren: false,
            });
          }
        }
      }
      return rows;
    }

    // Normal mode (no grouping)
    const rows = [];
    for (const proj of projects) {
      rows.push({ type: "project-header", project: proj });
      if (!collapsedProjects.has(proj.id)) {
        const filtered = applyFilter(proj.tasks);
        const sorted = applySort(filtered);
        rows.push(...buildTaskRows(sorted, proj.id));
      }
    }
    return rows;
  }, [projects, collapsedProjects, collapsedIds, sortMode, filterState, isFilterActive, groupBy, collapsedGroups]);

  const toggleCollapse = useCallback((taskId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const toggleGroupCollapse = useCallback((groupKey) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const toggleProjectCollapse = useCallback((projectId) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const handleAddTask = (projectId) => {
    setModalState({ open: true, task: null, projectId: projectId || projects[0]?.id });
  };

  const handleTaskClick = (task, projectId) => {
    setModalState({ open: true, task, projectId });
  };

  const handleModalClose = () => {
    setModalState({ open: false, task: null, projectId: null });
  };

  const handleModalSave = (formData) => {
    const targetProjectId = formData.projectId || modalState.projectId;
    if (modalState.task) {
      editTask(modalState.task, modalState.projectId, formData);
    } else {
      const { projectId: _pid, ...taskData } = formData;
      addTask(taskData, targetProjectId);
    }
    handleModalClose();
  };

  const handleDeleteTask = (taskId, projectId) => {
    const proj = projects.find((p) => p.id === projectId);
    const hasChildren = proj && proj.tasks.some((t) => t.parentId === taskId);
    const message = hasChildren
      ? "配下のタスクも全て削除されます。削除しますか？"
      : "タスクを削除しますか？";
    if (!window.confirm(message)) return;
    deleteTask(taskId, projectId);
  };

  const handleTaskUpdate = useCallback((taskId, updates, projectId) => {
    setProjectsWithHistory((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          tasks: proj.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        };
      })
    );
  }, [setProjectsWithHistory]);

  // B5: Inline project creation (replaces prompt())
  const handleStartAddProject = () => {
    setAddingProject(true);
    setNewProjectName("");
  };

  const handleConfirmAddProject = () => {
    const name = newProjectName.trim();
    if (!name) {
      setAddingProject(false);
      return;
    }
    setProjectsWithHistory((prev) => [
      ...prev,
      { id: generateProjectId(), name, collapsed: false, tasks: [] },
    ]);
    setAddingProject(false);
    setNewProjectName("");
  };

  const handleCancelAddProject = () => {
    setAddingProject(false);
    setNewProjectName("");
  };

  const handleDeleteProject = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    const name = project ? project.name : "";
    if (!window.confirm(`プロジェクト「${name}」を削除しますか？`)) return;
    setProjectsWithHistory((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleProjectNameChange = (projectId, name) => {
    setProjectsWithHistory((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name } : p))
    );
  };

  // B3: Task reorder (drag & drop)
  const handleReorderTask = useCallback((draggedItem, targetItem) => {
    if (draggedItem.projectId !== targetItem.projectId) return;
    setProjectsWithHistory((prev) =>
      prev.map((proj) => {
        if (proj.id !== draggedItem.projectId) return proj;
        const tasks = [...proj.tasks];
        const fromIdx = tasks.findIndex((t) => t.id === draggedItem.taskId);
        const toIdx = tasks.findIndex((t) => t.id === targetItem.taskId);
        if (fromIdx === -1 || toIdx === -1) return proj;
        const [moved] = tasks.splice(fromIdx, 1);
        tasks.splice(toIdx, 0, moved);
        return { ...proj, tasks };
      })
    );
  }, [setProjectsWithHistory]);

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportExcel = useCallback(() => {
    exportToExcel(projects, viewRange);
  }, [projects, viewRange]);

  // FN-1: Task duplication
  const handleDuplicateTask = useCallback((taskId, projectId) => {
    setProjectsWithHistory((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const tasks = [...proj.tasks];
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx === -1) return proj;
        const original = tasks[idx];

        // Check if it's a group task with children
        const childTasks = tasks.filter((t) => t.parentId === taskId);
        const newParentId = crypto.randomUUID();
        const duplicated = {
          ...original,
          id: newParentId,
          name: `${original.name}(コピー)`,
        };

        if (childTasks.length === 0) {
          // Simple task: insert right after original
          tasks.splice(idx + 1, 0, duplicated);
        } else {
          // Group task: duplicate parent + all children with new IDs
          const idMap = new Map();
          idMap.set(taskId, newParentId);

          // Build new children recursively
          const newChildren = [];
          const buildChildren = (oldParentId) => {
            const kids = tasks.filter((t) => t.parentId === oldParentId);
            for (const kid of kids) {
              const newKidId = crypto.randomUUID();
              idMap.set(kid.id, newKidId);
              newChildren.push({
                ...kid,
                id: newKidId,
                name: kid.name,
                parentId: idMap.get(oldParentId),
              });
              buildChildren(kid.id);
            }
          };
          buildChildren(taskId);

          // Find the last descendant index to insert after the whole group
          const descIds = getDescendantIds(tasks, taskId);
          let lastIdx = idx;
          tasks.forEach((t, i) => {
            if (descIds.has(t.id) && i > lastIdx) lastIdx = i;
          });

          tasks.splice(lastIdx + 1, 0, duplicated, ...newChildren);
        }

        return { ...proj, tasks };
      })
    );
  }, [setProjectsWithHistory]);

  const handleClearAll = useCallback(() => {
    if (!window.confirm("全データをクリアしますか？")) return;
    setProjectsWithHistory([]);
    setCollapsedIds(new Set());
    setCollapsedProjects(new Set());
  }, [setProjectsWithHistory]);

  const handleSave = () => {
    saveJson({ viewRange, colorMode, darkMode });
  };

  const handleLoad = (e) => {
    loadJson(e, viewRange, {
      onMeta: ({ viewRange: vr, colorMode: cm, darkMode: dm }) => {
        if (vr) setViewRange(vr);
        if (cm !== undefined) setColorMode(cm);
        if (dm !== undefined) setDarkMode(dm);
      },
    });
  };

  // Flatten all tasks for the modal's parent options
  const allTasksFlat = useMemo(
    () => projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectId: p.id }))),
    [projects]
  );

  return (
    <div className="app">
      <Toolbar
        onAddTask={() => handleAddTask(null)}
        onAddProject={handleStartAddProject}
        onSave={handleSave}
        onLoad={handleLoad}
        onExportExcel={handleExportExcel}
        onPrintPdf={handlePrintPdf}
        viewRange={viewRange}
        onViewRangeChange={setViewRange}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        onClearAll={handleClearAll}
        onScrollToToday={handleScrollToToday}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        showFilterPanel={showFilterPanel}
        onToggleFilterPanel={() => setShowFilterPanel((v) => !v)}
        isFilterActive={isFilterActive}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />
      {/* Filter panel */}
      {showFilterPanel && (
        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-group-label">担当者</span>
            <div className="filter-options">
              {filterOptions.assignees.map((a) => (
                <label key={a} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filterState.assignees.includes(a)}
                    onChange={() => {
                      setFilterState((prev) => ({
                        ...prev,
                        assignees: prev.assignees.includes(a)
                          ? prev.assignees.filter((x) => x !== a)
                          : [...prev.assignees, a],
                      }));
                    }}
                  />
                  {a}
                </label>
              ))}
              {filterOptions.assignees.length === 0 && (
                <span className="filter-empty">（担当者なし）</span>
              )}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-group-label">場所</span>
            <div className="filter-options">
              {filterOptions.locations.map((l) => (
                <label key={l} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filterState.locations.includes(l)}
                    onChange={() => {
                      setFilterState((prev) => ({
                        ...prev,
                        locations: prev.locations.includes(l)
                          ? prev.locations.filter((x) => x !== l)
                          : [...prev.locations, l],
                      }));
                    }}
                  />
                  {l}
                </label>
              ))}
              {filterOptions.locations.length === 0 && (
                <span className="filter-empty">（場所なし）</span>
              )}
            </div>
          </div>
          {isFilterActive && (
            <button
              className="filter-clear-btn"
              onClick={() => setFilterState({ assignees: [], locations: [] })}
            >
              フィルタ解除
            </button>
          )}
        </div>
      )}
      {/* B5: Inline project name input */}
      {addingProject && (
        <div className="inline-project-input">
          <input
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmAddProject();
              if (e.key === "Escape") handleCancelAddProject();
            }}
            onBlur={handleCancelAddProject}
            autoFocus
          />
        </div>
      )}
      <div className="main-content">
        <div className="left-panel" ref={leftPanelRef} onScroll={syncScroll("left")}>
          <TaskList
            displayRows={displayRows}
            collapsedIds={collapsedIds}
            collapsedProjects={collapsedProjects}
            onToggleCollapse={toggleCollapse}
            onToggleProjectCollapse={toggleProjectCollapse}
            onTaskClick={handleTaskClick}
            onDelete={handleDeleteTask}
            onDeleteProject={handleDeleteProject}
            onProjectNameChange={handleProjectNameChange}
            onReorder={handleReorderTask}
            colorMode={colorMode}
            collapsedGroups={collapsedGroups}
            onToggleGroupCollapse={toggleGroupCollapse}
          />
        </div>
        <div className="right-panel" ref={rightPanelRef} onScroll={syncScroll("right")}>
          <GanttChart
            displayRows={displayRows}
            months={months}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
            colorMode={colorMode}
            darkMode={darkMode}
            viewRange={viewRange}
            viewMode={viewMode}
            tasks={allTasksFlat}
          />
        </div>
      </div>
      <div className="status-bar">
        期間: {months[0]} - {months[months.length - 1]} | プロジェクト:{" "}
        {projects.length} | タスク:{" "}
        {projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.type !== "milestone").length, 0)} |
        マイルストーン:{" "}
        {projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.type === "milestone").length, 0)}
      </div>

      {modalState.open && (
        <TaskModal
          task={modalState.task}
          projects={projects}
          currentProjectId={modalState.projectId}
          onSave={handleModalSave}
          onClose={handleModalClose}
          onDuplicate={handleDuplicateTask}
          viewRange={viewRange}
          allTasks={allTasksFlat}
        />
      )}
    </div>
  );
}

export default App;
