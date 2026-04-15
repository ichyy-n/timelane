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

// Format date for input[type="date"] default
function defaultDate(viewRange, offsetMonths) {
  let y = viewRange.startYear;
  let m = viewRange.startMonth + offsetMonths;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export default function TaskModal({ task, projects, currentProjectId, onSave, onClose, onDuplicate, viewRange, allTasks }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    assignee: "",
    startDate: defaultDate(viewRange, 0),
    endDate: defaultDate(viewRange, 1),
    color: COLOR_PALETTE[0],
    type: "task",
    parentId: null,
    notes: "",
    progress: 0,
    status: "not_started",
    dependencies: [],
    projectId: currentProjectId || projects[0]?.id,
    dates: [{ date: defaultDate(viewRange, 0), label: "" }],
  });

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        location: task.location,
        assignee: task.assignee,
        startDate: task.startDate,
        endDate: task.endDate || task.startDate,
        color: task.color,
        type: task.type || "task",
        parentId: task.parentId || null,
        notes: task.notes || "",
        progress: task.progress || 0,
        status: task.status || "not_started",
        dependencies: task.dependencies || [],
        projectId: currentProjectId || projects[0]?.id,
        dates: task.dates && task.dates.length > 0
          ? task.dates.map((d) => ({ date: d.date || "", label: d.label || "" }))
          : [{ date: task.startDate, label: "" }],
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
      startDate: form.startDate || null,
      endDate: form.type === "milestone" ? (form.startDate || null) : (form.endDate || null),
      parentId: form.parentId || null,
      progress: form.type === "milestone" ? undefined : (form.progress || 0),
      status: form.type === "milestone" ? undefined : (form.status || "not_started"),
    };
    if (form.type === "milestone") {
      const validDates = form.dates ? form.dates.filter((d) => d.date) : [];
      data.dates = validDates;
      if (validDates.length > 0) {
        data.startDate = validDates[0].date;
        data.endDate = data.startDate;
      } else {
        data.startDate = null;
        data.endDate = null;
      }
      delete data.progress;
    } else {
      delete data.dates;
    }
    onSave(data);
  };

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
        <h3>{task ? "タスク編集" : "タスク追加"}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            プロジェクト *
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
            タイプ
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="task"
                  checked={form.type === "task"}
                  onChange={() => handleChange("type", "task")}
                />
                タスク
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="milestone"
                  checked={form.type === "milestone"}
                  onChange={() => handleChange("type", "milestone")}
                />
                マイルストーン
              </label>
            </div>
          </label>

          <label>
            タスク名 *
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              autoFocus
              required
            />
          </label>

          <label>
            親タスク
            <select
              value={form.parentId || ""}
              onChange={(e) => handleChange("parentId", e.target.value || null)}
            >
              <option value="">なし（ルート）</option>
              {parentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          {form.type === "milestone" ? (
            <div className="milestone-dates-section">
              <label>マイルストーン日付</label>
              {form.dates.map((d, idx) => (
                <div key={idx} className="milestone-date-row">
                  <input
                    type="date"
                    value={d.date}
                    onChange={(e) => {
                      const newDates = [...form.dates];
                      newDates[idx] = { ...d, date: e.target.value };
                      handleChange("dates", newDates);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="ラベル"
                    value={d.label}
                    onChange={(e) => {
                      const newDates = [...form.dates];
                      newDates[idx] = { ...d, label: e.target.value };
                      handleChange("dates", newDates);
                    }}
                    style={{ flex: 1, marginTop: 0 }}
                  />
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => {
                      const newDates = form.dates.filter((_, i) => i !== idx);
                      handleChange("dates", newDates);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-add-date"
                onClick={() => {
                  handleChange("dates", [...form.dates, { date: defaultDate(viewRange, 0), label: "" }]);
                }}
              >
                + 日付追加
              </button>
            </div>
          ) : (
            <>
              <div className="form-row">
                <label>
                  開始日
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="date"
                      value={form.startDate || ""}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {form.startDate && (
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleChange("startDate", "")}
                        title="開始日をクリア"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </label>
                <label>
                  終了日
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="date"
                      value={form.endDate || ""}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {form.endDate && (
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleChange("endDate", "")}
                        title="終了日をクリア"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </label>
              </div>

              {/* B4: Progress field */}
              <label>
                進捗: {form.progress}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.progress}
                  onChange={(e) => handleChange("progress", Number(e.target.value))}
                />
              </label>

              {/* C5: Status field */}
              <label>
                ステータス
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="not_started">未着手</option>
                  <option value="in_progress">進行中</option>
                  <option value="done">完了</option>
                </select>
              </label>
            </>
          )}

          {/* C1: 依存先タスク選択（milestoneには表示しない） */}
          {form.type !== 'milestone' && (
            <label>
              依存先タスク（完了後に開始）
              <select
                multiple
                value={form.dependencies || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                  handleChange("dependencies", selected);
                }}
                style={{ minHeight: 80 }}
              >
                {(allTasks || [])
                  .filter(t => t.id !== (task?.id) && t.type !== 'milestone')
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))
                }
              </select>
              <small>Ctrl+クリックで複数選択</small>
            </label>
          )}

          <label>
            担当者
            <input
              type="text"
              value={form.assignee}
              onChange={(e) => handleChange("assignee", e.target.value)}
            />
          </label>

          <label>
            場所
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />
          </label>

          <label>
            バーの色
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
            備考
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={2}
            />
          </label>

          <div className="modal-actions">
            {task && onDuplicate && (
              <button
                type="button"
                className="btn-duplicate"
                onClick={() => {
                  onDuplicate(task.id, currentProjectId);
                  onClose();
                }}
              >
                📋 複製
              </button>
            )}
            <button type="button" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
