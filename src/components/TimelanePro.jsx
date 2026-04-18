import React, { useRef } from 'react';
import {
  MOCK_PROJECTS,
  dateUtil,
  avatarColor,
  initials,
  PRIORITY_META,
} from '../data/mockdata.js';
import TaskModal from './TaskModal.jsx';
import { generateId } from '../data/sampleData.js';

// 案C: 情報密度高めのプロフェッショナル
// - Asana/ClickUp系、サイドバー付き、詳細パネル、密度高め
// - 進捗バー + スパークライン + ワークロードサマリ
// - ビジネス色強めでも洗練

export default function TimelanePro({ dark = false, granularity = 'month' }) {
  const [projects, setProjects] = React.useState(MOCK_PROJECTS);
  const [hoverTaskId, setHoverTaskId] = React.useState(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState('t1');
  const [modalState, setModalState] = React.useState({ open: false, task: null, projectId: null });
  const fileInputRef = useRef(null);

  const C = dark ? {
    bg: '#0f1419', panel: '#161b22', panelAlt: '#1a2029',
    sidebar: '#0a0e13',
    border: '#232933', borderSoft: '#1c222a',
    text: '#e6edf3', textSub: '#8b949e', textFaint: '#6e7681',
    accent: '#2f81f7', accentSoft: 'rgba(47,129,247,0.15)',
    success: '#3fb950', warning: '#d29922', danger: '#f85149',
    today: '#f85149',
    barBg: '#21262d',
    hover: 'rgba(255,255,255,0.04)',
  } : {
    bg: '#f6f8fa', panel: '#ffffff', panelAlt: '#f6f8fa',
    sidebar: '#ffffff',
    border: '#d0d7de', borderSoft: '#e6ebf0',
    text: '#1f2328', textSub: '#656d76', textFaint: '#8c959f',
    accent: '#0969da', accentSoft: '#ddf4ff',
    success: '#1a7f37', warning: '#9a6700', danger: '#cf222e',
    today: '#cf222e',
    barBg: '#eaeef2',
    hover: '#f6f8fa',
  };

  const rangeStart = new Date(2026, 2, 1);
  const rangeEnd = new Date(2027, 0, 31);
  const viewRange = { startYear: 2026, startMonth: 3, endYear: 2027, endMonth: 1 };
  const totalDays = dateUtil.diffDays(rangeStart, rangeEnd);
  const axisUnits = granularity === 'week'
    ? dateUtil.weeksBetween(rangeStart, rangeEnd)
    : dateUtil.monthsBetween(rangeStart, rangeEnd);
  const axisWidthPx = granularity === 'week' ? 48 : 80;
  const timelineWidth = axisUnits.length * axisWidthPx;
  const todayPx = (dateUtil.diffDays(rangeStart, dateUtil.today()) / totalDays) * timelineWidth;
  const leftColWidth = 360;

  const toggleProject = (pid) => {
    setProjects(projects.map(p => p.id === pid ? { ...p, collapsed: !p.collapsed } : p));
  };

  const handleAddTask = (projectId) => {
    setModalState({ open: true, task: null, projectId: projectId || projects[0]?.id });
  };

  const handleEditTask = (task, projectId) => {
    setModalState({ open: true, task, projectId });
  };

  const handleModalClose = () => {
    setModalState({ open: false, task: null, projectId: null });
  };

  const handleModalSave = (formData) => {
    const targetProjectId = formData.projectId || modalState.projectId;
    setProjects(prev =>
      prev.map(proj => {
        if (proj.id !== targetProjectId) {
          if (modalState.task && proj.tasks.some(t => t.id === modalState.task.id)) {
            return { ...proj, tasks: proj.tasks.filter(t => t.id !== modalState.task.id) };
          }
          return proj;
        }
        const { projectId: _pid, ...taskData } = formData;
        if (modalState.task) {
          const existsHere = proj.tasks.some(t => t.id === modalState.task.id);
          if (existsHere) {
            return { ...proj, tasks: proj.tasks.map(t =>
              t.id === modalState.task.id ? { ...t, ...taskData } : t
            )};
          } else {
            return { ...proj, tasks: [...proj.tasks, { ...modalState.task, ...taskData }] };
          }
        }
        return { ...proj, tasks: [...proj.tasks, {
          id: generateId(),
          type: 'task',
          parentId: null,
          notes: '',
          color: '#dbeafe',
          progress: 0,
          status: 'planned',
          priority: 'med',
          ...taskData,
        }]};
      })
    );
    handleModalClose();
  };

  const handleSave = () => {
    const data = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      projects,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timelane-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.version === '1.0' && data.projects) {
          setProjects(data.projects);
        } else {
          alert('無効なファイル形式です。');
        }
      } catch {
        alert('JSONファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteTask = (taskId, projectId) => {
    if (!window.confirm('このタスクを削除しますか？')) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
    }));
    setSelectedTaskId(null);
  };

  const barPositionFor = (task) => {
    const ts = dateUtil.parse(task.startDate);
    const te = dateUtil.parse(task.endDate);
    const left = (dateUtil.diffDays(rangeStart, ts) / totalDays) * timelineWidth;
    const width = Math.max(4, (dateUtil.diffDays(ts, te) / totalDays) * timelineWidth);
    return { left, width };
  };

  const allTasks = projects.flatMap(p => p.tasks);
  const allTasksFlat = projects.flatMap(p => p.tasks.map(t => ({ ...t, projectId: p.id })));
  const selectedTask = allTasks.find(t => t.id === selectedTaskId);

  // ワークロード（月別タスク数）
  const workload = axisUnits.map((d) => {
    const monthStart = d;
    const monthEnd = granularity === 'week'
      ? dateUtil.addDays(d, 7)
      : new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = allTasks.filter(t => {
      const ts = dateUtil.parse(t.startDate);
      const te = dateUtil.parse(t.endDate);
      return ts < monthEnd && te >= monthStart;
    }).length;
    return count;
  });
  const maxWorkload = Math.max(...workload, 1);

  return (
    <div style={{
      background: C.bg, color: C.text,
      fontFamily: "'Inter', 'SF Pro Text', -apple-system, system-ui, 'Noto Sans JP', sans-serif",
      fontSize: 13, height: '100%', display: 'flex',
    }}>
      {/* サイドバー */}
      <div style={{
        width: 200, background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 14px' }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>T</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Timelane</div>
        </div>

        <SidebarSectionP C={C} title="ビュー">
          <SidebarItemP C={C} icon="▦" active>タイムライン</SidebarItemP>
          <SidebarItemP C={C} icon="▤">テーブル</SidebarItemP>
          <SidebarItemP C={C} icon="▥">ボード</SidebarItemP>
          <SidebarItemP C={C} icon="▩">ダッシュボード</SidebarItemP>
        </SidebarSectionP>

        <SidebarSectionP C={C} title="プロジェクト">
          {projects.map(p => (
            <SidebarItemP key={p.id} C={C} icon="●" dot>{p.name}</SidebarItemP>
          ))}
          <SidebarItemP C={C} icon="＋" muted>追加</SidebarItemP>
        </SidebarSectionP>

        <div style={{ flex: 1 }}/>

        {/* 現在のユーザ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px',
          borderTop: `1px solid ${C.borderSoft}`, marginTop: 8,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 13,
            background: avatarColor('山田 太郎'), color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600,
          }}>山</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>山田 太郎</div>
            <div style={{ fontSize: 10, color: C.textFaint }}>工事管理部</div>
          </div>
        </div>
      </div>

      {/* メイン */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* ヘッダー */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: `1px solid ${C.border}`, background: C.panel,
        }}>
          <div>
            <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 2 }}>
              プロジェクト / タイムライン
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>工事計画タイムライン</div>
          </div>

          <div style={{ flex: 1 }}/>

          {/* 期間 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: C.panelAlt, border: `1px solid ${C.borderSoft}`, borderRadius: 5, padding: 3,
          }}>
            {['日', '週', '月', '四半期', '年'].map(u => (
              <button key={u} style={{
                background: u === '月' ? C.bg : 'transparent',
                color: u === '月' ? C.text : C.textSub,
                border: 'none', padding: '4px 10px', borderRadius: 3,
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                boxShadow: u === '月' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}>{u}</button>
            ))}
          </div>

          <ButtonP C={C}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
            今日
          </ButtonP>
          <ButtonP C={C}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M2 6h8M2 9h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            フィルタ
          </ButtonP>
          <ButtonP C={C} onClick={handleSave}>
            ↓ 保存
          </ButtonP>
          <ButtonP C={C} onClick={() => fileInputRef.current?.click()}>
            ↑ 読込
          </ButtonP>
          <ButtonP C={C} primary onClick={() => handleAddTask(null)}>
            ＋ タスク追加
          </ButtonP>
        </div>

        {/* サマリーバー */}
        <div style={{
          padding: '10px 20px', display: 'flex', gap: 18,
          borderBottom: `1px solid ${C.border}`, background: C.panel,
        }}>
          <SummaryCardP C={C} label="全タスク" value={allTasks.length} />
          <SummaryCardP C={C} label="進行中" value={allTasks.filter(t => t.status === 'in-progress').length} color={C.accent} />
          <SummaryCardP C={C} label="完了" value={allTasks.filter(t => t.status === 'done').length} color={C.success} />
          <SummaryCardP C={C} label="予定" value={allTasks.filter(t => t.status === 'planned').length} color={C.textSub} />
          <SummaryCardP C={C} label="優先度高" value={allTasks.filter(t => t.priority === 'high').length} color={C.danger} />
          <div style={{ flex: 1 }}/>
          <ProgressPieP
            label="全体進捗"
            value={Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length)}
            C={C}
          />
        </div>

        {/* タイムライン */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            <div style={{
              minWidth: leftColWidth + timelineWidth, position: 'relative',
            }}>
              {/* ヘッダー行 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `${leftColWidth}px ${timelineWidth}px`,
                position: 'sticky', top: 0, zIndex: 3,
                background: C.panelAlt,
                borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{
                  padding: '0 14px',
                  fontSize: 10, fontWeight: 600, color: C.textSub,
                  letterSpacing: 0.8, textTransform: 'uppercase',
                  borderRight: `1px solid ${C.border}`,
                  position: 'sticky', left: 0, background: C.panelAlt, zIndex: 4,
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 32,
                }}>
                  <span style={{ flex: 1 }}>タスク / 担当</span>
                  <span style={{ width: 42 }}>状態</span>
                  <span style={{ width: 34, textAlign: 'right' }}>進捗</span>
                </div>
                <div style={{ position: 'relative', height: 32 }}>
                  {axisUnits.map((d, i) => (
                    <div key={i} style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: i * axisWidthPx, width: axisWidthPx,
                      borderLeft: i === 0 ? 'none' : `1px solid ${C.borderSoft}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600, color: C.textSub,
                      letterSpacing: 0.3,
                    }}>
                      {granularity === 'week'
                        ? `${d.getMonth() + 1}/${d.getDate()}`
                        : dateUtil.fmtMonth(d)}
                    </div>
                  ))}
                </div>
              </div>

              {/* ワークロード行 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `${leftColWidth}px ${timelineWidth}px`,
                borderBottom: `1px solid ${C.border}`,
                background: C.panelAlt,
              }}>
                <div style={{
                  padding: '0 14px',
                  fontSize: 11, color: C.textSub,
                  borderRight: `1px solid ${C.border}`,
                  position: 'sticky', left: 0, background: C.panelAlt, zIndex: 2,
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 36,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 10V6l2-2 2 3 3-5 3 3" stroke={C.accent} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  ワークロード
                </div>
                <div style={{ position: 'relative', height: 36, padding: '4px 0' }}>
                  {workload.map((v, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      left: i * axisWidthPx + 4, width: axisWidthPx - 8,
                      bottom: 4, height: `${(v / maxWorkload) * 24}px`,
                      background: v >= maxWorkload * 0.8 ? C.warning : C.accent,
                      opacity: 0.65, borderRadius: '2px 2px 0 0',
                    }}/>
                  ))}
                  {workload.map((v, i) => v > 0 && (
                    <div key={`l${i}`} style={{
                      position: 'absolute',
                      left: i * axisWidthPx, width: axisWidthPx,
                      top: 6, textAlign: 'center',
                      fontSize: 9, fontWeight: 600, color: C.textSub,
                    }}>{v}</div>
                  ))}
                </div>
              </div>

              {/* プロジェクト + タスク */}
              {projects.map((project) => {
                const projStarts = project.tasks.map(t => dateUtil.parse(t.startDate));
                const projEnds = project.tasks.map(t => dateUtil.parse(t.endDate));
                const projAvg = project.tasks.length > 0
                  ? Math.round(project.tasks.reduce((s, t) => s + t.progress, 0) / project.tasks.length)
                  : 0;
                return (
                  <React.Fragment key={project.id}>
                    {/* プロジェクト行 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `${leftColWidth}px ${timelineWidth}px`,
                      borderBottom: `1px solid ${C.border}`,
                      background: C.panelAlt,
                    }}>
                      <div
                        onClick={() => toggleProject(project.id)}
                        style={{
                          padding: '8px 14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          borderRight: `1px solid ${C.border}`,
                          position: 'sticky', left: 0, background: C.panelAlt, zIndex: 2,
                        }}>
                        <span style={{
                          color: C.textSub, fontSize: 10, width: 10,
                          transform: project.collapsed ? 'rotate(0)' : 'rotate(90deg)',
                          transition: 'transform 0.15s',
                        }}>▶</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>
                          {project.name}
                        </span>
                        <span style={{
                          fontSize: 10, color: C.textSub,
                          padding: '1px 6px', borderRadius: 10,
                          background: C.bg, border: `1px solid ${C.borderSoft}`,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {project.tasks.length} · {projAvg}%
                        </span>
                      </div>
                      <div style={{ position: 'relative', height: 32 }}>
                        {axisUnits.map((_, i) => (
                          <div key={i} style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: i * axisWidthPx, width: 1,
                            background: i === 0 ? 'transparent' : C.borderSoft,
                          }}/>
                        ))}
                        {projStarts.length > 0 && (() => {
                          const minS = new Date(Math.min(...projStarts));
                          const maxE = new Date(Math.max(...projEnds));
                          const left = (dateUtil.diffDays(rangeStart, minS) / totalDays) * timelineWidth;
                          const width = (dateUtil.diffDays(minS, maxE) / totalDays) * timelineWidth;
                          return (
                            <div style={{
                              position: 'absolute', left, width,
                              top: '50%', transform: 'translateY(-50%)',
                              height: 6, background: C.textFaint, opacity: 0.25,
                              borderRadius: 1,
                            }}>
                              {/* 進捗 */}
                              <div style={{
                                height: '100%', width: `${projAvg}%`,
                                background: C.textSub, opacity: 0.9,
                              }}/>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* タスク行 */}
                    {!project.collapsed && project.tasks.map((task) => {
                      const { left, width } = barPositionFor(task);
                      const isHover = hoverTaskId === task.id;
                      const isSelected = selectedTaskId === task.id;
                      const statusColor = task.status === 'done' ? C.success
                                         : task.status === 'in-progress' ? C.accent
                                         : C.textFaint;
                      return (
                        <div key={task.id}
                          onMouseEnter={() => setHoverTaskId(task.id)}
                          onMouseLeave={() => setHoverTaskId(null)}
                          onClick={() => setSelectedTaskId(task.id)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `${leftColWidth}px ${timelineWidth}px`,
                            borderBottom: `1px solid ${C.borderSoft}`,
                            background: isSelected ? C.accentSoft : (isHover ? C.hover : C.panel),
                            cursor: 'pointer',
                          }}>
                          <div style={{
                            padding: '6px 14px 6px 34px',
                            display: 'flex', alignItems: 'center', gap: 10,
                            borderRight: `1px solid ${C.border}`,
                            position: 'sticky', left: 0, zIndex: 1,
                            background: isSelected ? (dark ? '#132038' : C.accentSoft) : (isHover ? C.hover : C.panel),
                            borderLeft: isSelected ? `2px solid ${C.accent}` : '2px solid transparent',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 12, color: C.text, fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                                {task.priority === 'high' && (
                                  <span style={{ color: C.danger, fontSize: 10 }}>●</span>
                                )}
                                {task.priority === 'med' && (
                                  <span style={{ color: C.warning, fontSize: 10 }}>●</span>
                                )}
                                {task.priority === 'low' && (
                                  <span style={{ color: C.textFaint, fontSize: 10 }}>●</span>
                                )}
                                {task.name}
                              </div>
                              <div style={{
                                fontSize: 10, color: C.textSub, marginTop: 2,
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                                <AvatarP name={task.assignee} size={14} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {task.assignee} · {task.location}
                                </span>
                              </div>
                            </div>
                            <StatusPillP C={C} status={task.status} />
                            <div style={{
                              width: 34, textAlign: 'right',
                              fontSize: 11, fontWeight: 600, color: statusColor,
                              fontVariantNumeric: 'tabular-nums',
                            }}>
                              {task.progress}%
                            </div>
                          </div>
                          <div style={{ position: 'relative', height: 42 }}>
                            {axisUnits.map((_, i) => (
                              <div key={i} style={{
                                position: 'absolute', top: 0, bottom: 0,
                                left: i * axisWidthPx, width: 1,
                                background: i === 0 ? 'transparent' : C.borderSoft,
                              }}/>
                            ))}
                            <div style={{
                              position: 'absolute', left, width,
                              top: 10, height: 22,
                              background: C.barBg,
                              borderRadius: 3,
                              overflow: 'hidden', display: 'flex', alignItems: 'center',
                              border: `1px solid ${statusColor}40`,
                              boxShadow: isSelected ? `0 0 0 2px ${C.accent}, 0 2px 8px rgba(0,0,0,0.15)`
                                       : isHover ? `0 2px 6px ${statusColor}40` : 'none',
                              transition: 'box-shadow 0.15s',
                            }}>
                              <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${task.progress}%`,
                                background: statusColor,
                              }}/>
                              <span style={{
                                position: 'relative', zIndex: 1, padding: '0 6px',
                                fontSize: 10, fontWeight: 600,
                                color: task.progress > 30 ? '#fff' : C.text,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {task.name} · {task.progress}%
                              </span>
                            </div>
                            {/* ミニ期間ラベル */}
                            {width > 80 && (
                              <>
                                <div style={{
                                  position: 'absolute', left: left, top: 34,
                                  fontSize: 9, color: C.textFaint,
                                  fontVariantNumeric: 'tabular-nums',
                                }}>
                                  {task.startDate.slice(5).replace('-', '/')}
                                </div>
                                <div style={{
                                  position: 'absolute', left: left + width - 32, top: 34,
                                  fontSize: 9, color: C.textFaint,
                                  fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                                }}>
                                  {task.endDate.slice(5).replace('-', '/')}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* 今日ライン */}
              <div style={{
                position: 'absolute', top: 32,
                left: leftColWidth + todayPx, width: 1, bottom: 0,
                background: C.today, pointerEvents: 'none', zIndex: 2,
                boxShadow: `0 0 0 2px ${C.today}20`,
              }}>
                <div style={{
                  position: 'absolute', top: 36, left: -1, width: 7, height: 7,
                  borderRadius: 4, background: C.today,
                  transform: 'translateX(-3px)',
                }}/>
                <div style={{
                  position: 'absolute', top: -26, left: -16,
                  padding: '2px 6px', fontSize: 9, fontWeight: 700,
                  color: '#fff', background: C.today, borderRadius: 3,
                }}>TODAY</div>
              </div>
            </div>
          </div>

          {modalState.open && (
            <TaskModal
              task={modalState.task}
              projects={projects}
              currentProjectId={modalState.projectId}
              onSave={handleModalSave}
              onClose={handleModalClose}
              viewRange={viewRange}
              allTasks={allTasksFlat}
            />
          )}

          {/* 右詳細パネル */}
          {selectedTask && (
            <div style={{
              width: 280, background: C.panel,
              borderLeft: `1px solid ${C.border}`,
              padding: '16px', overflow: 'auto',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 10, color: C.textFaint, marginBottom: 4, letterSpacing: 0.5 }}>
                  タスク詳細
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                  {selectedTask.name}
                </div>
                <StatusPillP C={C} status={selectedTask.status} />
              </div>

              <div>
                <div style={{ fontSize: 10, color: C.textFaint, marginBottom: 6, letterSpacing: 0.5 }}>
                  進捗
                </div>
                <div style={{
                  height: 8, background: C.barBg, borderRadius: 4, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${selectedTask.progress}%`,
                    background: selectedTask.status === 'done' ? C.success : C.accent,
                  }}/>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                  {selectedTask.progress}<span style={{ fontSize: 12, color: C.textSub }}>%</span>
                </div>
              </div>

              <DetailRowP C={C} label="担当者">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AvatarP name={selectedTask.assignee} size={22} />
                  <span>{selectedTask.assignee}</span>
                </div>
              </DetailRowP>
              <DetailRowP C={C} label="場所">{selectedTask.location}</DetailRowP>
              <DetailRowP C={C} label="期間">
                {selectedTask.startDate.replace(/-/g, '/')} 〜 {selectedTask.endDate.replace(/-/g, '/')}
              </DetailRowP>
              <DetailRowP C={C} label="日数">
                {dateUtil.diffDays(dateUtil.parse(selectedTask.startDate), dateUtil.parse(selectedTask.endDate))}日間
              </DetailRowP>
              <DetailRowP C={C} label="優先度">
                <span style={{
                  color: selectedTask.priority === 'high' ? C.danger
                       : selectedTask.priority === 'med' ? C.warning : C.textFaint,
                  fontWeight: 600,
                }}>
                  ● {PRIORITY_META[selectedTask.priority].label}
                </span>
              </DetailRowP>

              <div style={{
                marginTop: 'auto', paddingTop: 12,
                borderTop: `1px solid ${C.borderSoft}`,
                display: 'flex', gap: 6,
              }}>
                <ButtonP C={C} small primary onClick={() => handleEditTask(selectedTask, projects.find(p => p.tasks.some(t => t.id === selectedTask.id))?.id)}>
                  編集
                </ButtonP>
                <ButtonP C={C} small onClick={() => handleDeleteTask(selectedTask.id, projects.find(p => p.tasks.some(t => t.id === selectedTask.id))?.id)}
                  style={{ color: '#cf222e', borderColor: '#cf222e' }}>
                  削除
                </ButtonP>
                <ButtonP C={C} small>履歴</ButtonP>
                <ButtonP C={C} small>•••</ButtonP>
              </div>
            </div>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleLoad}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ── 案C用ヘルパー ──
function SidebarSectionP({ C, title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: C.textFaint,
        letterSpacing: 0.8, padding: '4px 8px', marginBottom: 2,
        textTransform: 'uppercase',
      }}>{title}</div>
      {children}
    </div>
  );
}
function SidebarItemP({ C, icon, active, muted, dot, children }) {
  return (
    <div style={{
      padding: '5px 8px', borderRadius: 4,
      fontSize: 12, color: active ? C.text : (muted ? C.textFaint : C.textSub),
      background: active ? C.accentSoft : 'transparent',
      fontWeight: active ? 500 : 400,
      display: 'flex', alignItems: 'center', gap: 8,
      cursor: 'pointer',
    }}>
      <span style={{
        width: 14, textAlign: 'center',
        color: dot ? avatarColor(children) : (active ? C.accent : C.textFaint),
        fontSize: dot ? 10 : 11,
      }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </div>
  );
}

function ButtonP({ C, primary, small, children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background: primary ? C.accent : C.panel,
      color: primary ? '#fff' : C.text,
      border: primary ? 'none' : `1px solid ${C.border}`,
      padding: small ? '4px 8px' : '5px 10px',
      borderRadius: 5, fontSize: small ? 11 : 12, fontWeight: 500,
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
      boxShadow: primary ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
      ...style,
    }}>{children}</button>
  );
}

function SummaryCardP({ C, label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textFaint, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700, color: color || C.text,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
      }}>
        {value}
      </div>
    </div>
  );
}

function ProgressPieP({ label, value, C }) {
  const r = 14, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: C.textFaint, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
          {value}%
        </div>
      </div>
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r={r} fill="none" stroke={C.barBg} strokeWidth="4"/>
          <circle cx="18" cy="18" r={r} fill="none" stroke={C.accent} strokeWidth="4"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)}
                  strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

function StatusPillP({ C, status }) {
  const meta = ({
    'done':        { label: '完了',   fg: C.success, bg: C.success + '22' },
    'in-progress': { label: '進行中', fg: C.accent,  bg: C.accentSoft },
    'planned':     { label: '予定',   fg: C.textSub, bg: C.borderSoft },
  })[status] || { label: status, fg: C.textSub, bg: C.borderSoft };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: meta.fg,
      background: meta.bg,
      padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap',
    }}>{meta.label}</span>
  );
}

function AvatarP({ name, size = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: avatarColor(name), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, fontWeight: 600, flexShrink: 0,
    }}>{initials(name)}</div>
  );
}

function DetailRowP({ C, label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textFaint, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: C.text }}>{children}</div>
    </div>
  );
}
