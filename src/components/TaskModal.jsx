import { useState, useEffect } from "react";
import { COLOR_PALETTE } from "../data/sampleData";

// Get all descendant IDs to prevent circular references
function getDescendantIds(tasks, taskId) {
  const ids = new Set();
  function walk(pid) {
    for (const t of tasks) {
      if (t.parentId === pid) {
        ids.add(t.id);
        walk(t.id);
      }
    }
  }
  walk(taskId);
  return ids;
}

export default function TaskModal({ task, projects, currentProjectId, onSave, onClose, viewRange }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    assignee: "",
    startMonth: 0,
    endMonth: 1,
    color: COLOR_PALETTE[0],
    type: "task",
    parentId: null,
    notes: "",
    projectId: currentProjectId || projects[0]?.id,
  });

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        location: task.location,
        assignee: task.assignee,
        startMonth: task.startMonth,
        endMonth: task.endMonth ?? task.startMonth,
        color: task.color,
        type: task.type || "task",
        parentId: task.parentId || null,
        notes: task.notes || "",
        projectId: currentProjectId || projects[0]?.id,
      });
    }
  }, [task, currentProjectId, projects]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const data = {
      ...form,
      startMonth: Number(form.startMonth),
      endMonth: form.type === "milestone" ? Number(form.startMonth) : Number(form.endMonth),
      parentId: form.parentId || null,
    };
    onSave(data);
  };

  const getMonthLabel = (offset) => {
    let y = viewRange.startYear;
    let m = viewRange.startMonth + offset;
    while (m > 12) { m -= 12; y++; }
    while (m < 1) { m += 12; y--; }
    return `${y}-${String(m).padStart(2, "0")}`;
  };

  // Calculate total months in range
  const totalMonths = (viewRange.endYear - viewRange.startYear) * 12 + (viewRange.endMonth - viewRange.startMonth) + 1;
  const monthOptions = Array.from({ length: totalMonths }, (_, i) => i);

  // Parent task options from selected project
  const selectedProject = projects.find((p) => p.id === form.projectId);
  const projectTasks = selectedProject ? selectedProject.tasks : [];
  const excludeIds = task ? getDescendantIds(projectTasks, task.id) : new Set();
  if (task) excludeIds.add(task.id);
  const parentOptions = projectTasks.filter(
    (t) => t.type !== "milestone" && !excludeIds.has(t.id)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{task ? "Edit Task" : "Add Task"}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Project *
            <select
              value={form.projectId}
              onChange={(e) => {
                handleChange("projectId", e.target.value);
                handleChange("parentId", null);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Type
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="task"
                  checked={form.type === "task"}
                  onChange={() => handleChange("type", "task")}
                />
                Task
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="milestone"
                  checked={form.type === "milestone"}
                  onChange={() => handleChange("type", "milestone")}
                />
                Milestone
              </label>
            </div>
          </label>

          <label>
            Task Name *
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              autoFocus
              required
            />
          </label>

          <label>
            Parent Task
            <select
              value={form.parentId || ""}
              onChange={(e) => handleChange("parentId", e.target.value || null)}
            >
              <option value="">None (Root)</option>
              {parentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-row">
            <label>
              Start
              <select
                value={form.startMonth}
                onChange={(e) => handleChange("startMonth", e.target.value)}
              >
                {monthOptions.map((i) => (
                  <option key={i} value={i}>
                    {getMonthLabel(i)}
                  </option>
                ))}
              </select>
            </label>
            {form.type !== "milestone" && (
              <label>
                End
                <select
                  value={form.endMonth}
                  onChange={(e) => handleChange("endMonth", e.target.value)}
                >
                  {monthOptions.map((i) => (
                    <option key={i} value={i}>
                      {getMonthLabel(i)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label>
            Assignee
            <input
              type="text"
              value={form.assignee}
              onChange={(e) => handleChange("assignee", e.target.value)}
            />
          </label>

          <label>
            Location
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />
          </label>

          <label>
            Color
            <div className="color-picker">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${form.color === c ? "selected" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => handleChange("color", c)}
                />
              ))}
            </div>
          </label>

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={2}
            />
          </label>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
