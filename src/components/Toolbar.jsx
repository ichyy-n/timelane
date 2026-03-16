export default function Toolbar({
  projectName,
  onProjectNameChange,
  onAddTask,
  onSave,
  onLoad,
}) {
  return (
    <div className="toolbar">
      <input
        className="project-name-input"
        value={projectName}
        onChange={(e) => onProjectNameChange(e.target.value)}
        placeholder="Project Name"
      />
      <div className="toolbar-actions">
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
