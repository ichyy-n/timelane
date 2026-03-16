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

export default function TaskModal({ task, allTasks, onSave, onClose, projectStart }) {
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
        type: task.type || (task.isMilestone ? "milestone" : "task"),
        parentId: task.parentId || null,
        notes: task.notes || "",
      });
    }
  }, [task]);

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
    const [y, m] = projectStart.split("-").map(Number);
    const date = new Date(y, m - 1 + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const monthOptions = Array.from({ length: 24 }, (_, i) => i);

  // Parent task options: exclude self and descendants (circular reference prevention)
  const excludeIds = task ? getDescendantIds(allTasks, task.id) : new Set();
  if (task) excludeIds.add(task.id);
  const parentOptions = allTasks.filter(
    (t) => t.type !== "milestone" && !excludeIds.has(t.id)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{task ? "Edit Task" : "Add Task"}</h3>
        <form onSubmit={handleSubmit}>
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
