export default function Toolbar({
  onAddTask,
  onAddProject,
  onSave,
  onLoad,
  viewRange,
  onViewRangeChange,
}) {
  const years = Array.from({ length: 10 }, (_, i) => 2024 + i);
  const monthNums = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleRangeChange = (field, value) => {
    onViewRangeChange((prev) => ({ ...prev, [field]: Number(value) }));
  };

  return (
    <div className="toolbar">
      <div className="toolbar-range">
        <span className="range-label">Range:</span>
        <select
          value={viewRange.startYear}
          onChange={(e) => handleRangeChange("startYear", e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={viewRange.startMonth}
          onChange={(e) => handleRangeChange("startMonth", e.target.value)}
        >
          {monthNums.map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>
        <span className="range-separator">-</span>
        <select
          value={viewRange.endYear}
          onChange={(e) => handleRangeChange("endYear", e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={viewRange.endMonth}
          onChange={(e) => handleRangeChange("endMonth", e.target.value)}
        >
          {monthNums.map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>
      </div>
      <div className="toolbar-actions">
        <button onClick={onAddProject}>+ Project</button>
        <button onClick={onAddTask} className="btn-primary">
          + Add Task
        </button>
        <button onClick={onSave}>Save JSON</button>
        <label className="btn-load">
          Load JSON
          <input
            type="file"
            accept=".json"
            onChange={onLoad}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </div>
  );
}
