export default function Toolbar({
  onAddTask,
  onAddProject,
  onSave,
  onLoad,
  onExportExcel,
  viewRange,
  onViewRangeChange,
  colorMode,
  onColorModeChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  darkMode,
  onDarkModeChange,
  onClearAll,
}) {
  const years = Array.from({ length: 10 }, (_, i) => 2024 + i);
  const monthNums = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleRangeChange = (field, value) => {
    onViewRangeChange((prev) => ({ ...prev, [field]: Number(value) }));
  };

  return (
    <div className="toolbar">
      <div className="toolbar-range">
        <span className="range-label">期間:</span>
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
      <div className="toolbar-search">
        <input
          type="text"
          placeholder="タスク/担当者/プロジェクトで絞り込み"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="btn-clear-search">✕</button>
        )}
      </div>
      <div className="toolbar-actions">
        <button
          onClick={() => onViewModeChange(viewMode === 'month' ? 'week' : 'month')}
          className={viewMode === 'week' ? 'btn-active' : ''}
          title={viewMode === 'month' ? '週表示に切替' : '月表示に切替'}
        >
          {viewMode === 'month' ? '週表示' : '月表示'}
        </button>
        <button
          onClick={() => onColorModeChange(!colorMode)}
          className={colorMode ? "btn-color-active" : ""}
          title={colorMode ? "カラー ON" : "モノクロ"}
        >
          {colorMode ? "\uD83C\uDFA8 カラー" : "\u25A0 モノクロ"}
        </button>
        <button
          onClick={() => onDarkModeChange(!darkMode)}
          className={darkMode ? "btn-dark-active" : ""}
          title={darkMode ? "ライトモードに切替" : "ダークモードに切替"}
        >
          {darkMode ? "☀️ ライト" : "🌙 ダーク"}
        </button>
        <button onClick={onClearAll} title="全データをクリア">🗑️ クリア</button>
        <button onClick={onAddProject}>+ プロジェクト</button>
        <button onClick={onAddTask}>
          + タスク追加
        </button>
        <button onClick={onExportExcel}>Excel出力</button>
        <button onClick={onSave}>JSON保存</button>
        <label className="btn-load">
          JSON読込
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
