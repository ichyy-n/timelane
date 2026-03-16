import { useState, useEffect } from "react";
import { COLOR_PALETTE } from "../data/sampleData";

export default function TaskModal({ task, onSave, onClose, projectStart }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    assignee: "",
    startMonth: 0,
    endMonth: 1,
    color: COLOR_PALETTE[0],
    isMilestone: false,
    notes: "",
  });

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        location: task.location,
        assignee: task.assignee,
        startMonth: task.startMonth,
        endMonth: task.endMonth,
        color: task.color,
        isMilestone: task.isMilestone,
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
    onSave({
      ...form,
      startMonth: Number(form.startMonth),
      endMonth: Number(form.endMonth),
    });
  };

  // Generate month options based on project start
  const getMonthLabel = (offset) => {
    const [y, m] = projectStart.split("-").map(Number);
    const date = new Date(y, m - 1 + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const monthOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{task ? "Edit Task" : "Add Task"}</h3>
        <form onSubmit={handleSubmit}>
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

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.isMilestone}
              onChange={(e) => handleChange("isMilestone", e.target.checked)}
            />
            Milestone
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
