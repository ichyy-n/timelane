import { useState, useRef, useEffect } from "react";

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
  darkMode,
  onDarkModeChange,
  onClearAll,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const years = Array.from({ length: 10 }, (_, i) => 2024 + i);
  const monthNums = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleRangeChange = (field, value) => {
    onViewRangeChange((prev) => ({ ...prev, [field]: Number(value) }));
  };

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isMenuOpen]);

  const handleMenuAction = (action) => {
    action();
    setIsMenuOpen(false);
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
      <button onClick={onAddTask}>+ タスク追加</button>
      <button
        className="view-mode-btn"
        onClick={() => onViewModeChange(viewMode === 'month' ? 'week' : 'month')}
      >
        {viewMode === 'month' ? '週表示' : '月表示'}
      </button>
      <div className="hamburger-wrapper" ref={menuRef}>
        <button
          className="hamburger-btn"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title="メニュー"
        >
          ☰
        </button>
        {isMenuOpen && (
          <div className="hamburger-menu">
            <button onClick={() => handleMenuAction(onAddProject)}>+ プロジェクト</button>
            <button onClick={() => handleMenuAction(() => onColorModeChange(!colorMode))}>
              {colorMode ? "🎨 カラー → モノクロ" : "■ モノクロ → カラー"}
            </button>
            <button onClick={() => handleMenuAction(() => onDarkModeChange(!darkMode))}>
              {darkMode ? "☀️ ライトモードに切替" : "🌙 ダークモードに切替"}
            </button>
            <button onClick={() => handleMenuAction(onExportExcel)}>Excel出力</button>
            <button onClick={() => handleMenuAction(onSave)}>JSON保存</button>
            <label className="hamburger-menu-load">
              JSON読込
              <input
                type="file"
                accept=".json"
                onChange={(e) => { onLoad(e); setIsMenuOpen(false); }}
                style={{ display: "none" }}
              />
            </label>
            <button onClick={() => handleMenuAction(onClearAll)}>🗑️ クリア</button>
          </div>
        )}
      </div>
    </div>
  );
}
