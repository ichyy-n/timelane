// Timelane共通モックデータ
// 工場・プラント工事の計画想定

export const MOCK_PROJECTS = [
  {
    id: 'p1',
    name: '大阪石油化学',
    collapsed: false,
    tasks: [
      { id: 't1',  name: 'インターロック改修',       assignee: '田中 健一', location: 'A棟 制御室',     startDate: '2026-07-15', endDate: '2026-10-05', progress: 65, status: 'in-progress', priority: 'high', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
      { id: 't2',  name: '配管耐圧試験',            assignee: '佐藤 美咲', location: 'A棟 第二配管室', startDate: '2026-04-01', endDate: '2026-05-20', progress: 100, status: 'done', priority: 'med', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
      { id: 't3',  name: '安全弁点検',              assignee: '鈴木 大輔', location: 'B棟',            startDate: '2026-05-10', endDate: '2026-06-25', progress: 88, status: 'in-progress', priority: 'med', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
      { id: 't4',  name: '計装盤更新',              assignee: '山田 花子', location: 'A棟 制御室',     startDate: '2026-08-01', endDate: '2026-11-15', progress: 20, status: 'in-progress', priority: 'high', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
      { id: 't5',  name: '触媒交換',                assignee: '伊藤 翔',   location: 'C棟 反応器',     startDate: '2026-09-10', endDate: '2026-10-20', progress: 0,  status: 'planned', priority: 'high', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
    ],
  },
  {
    id: 'p2',
    name: '千葉LNG基地',
    collapsed: false,
    tasks: [
      { id: 't6',  name: 'タンク内部検査',          assignee: '高橋 涼', location: 'T-3タンク',      startDate: '2026-06-01', endDate: '2026-08-10', progress: 45, status: 'in-progress', priority: 'high', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
      { id: 't7',  name: '防爆配線工事',            assignee: '渡辺 隆', location: '共用エリア',    startDate: '2026-04-20', endDate: '2026-07-01', progress: 72, status: 'in-progress', priority: 'med', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
      { id: 't8',  name: '消防設備点検',            assignee: '中村 恵', location: '全域',           startDate: '2026-03-15', endDate: '2026-04-10', progress: 100, status: 'done', priority: 'low', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
    ],
  },
  {
    id: 'p3',
    name: '四日市製油所',
    collapsed: true,
    tasks: [
      { id: 't9',  name: 'ボイラー定修',            assignee: '小林 剛', location: 'B-2',           startDate: '2026-07-01', endDate: '2026-09-30', progress: 15, status: 'in-progress', priority: 'high', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
      { id: 't10', name: '電気設備点検',            assignee: '加藤 光', location: '受電室',         startDate: '2026-11-05', endDate: '2026-12-20', progress: 0, status: 'planned', priority: 'med', type: 'task', parentId: null, notes: '', color: '#dbeafe' },
    ],
  },
];

// 日付関連ユーティリティ
export const dateUtil = {
  parse: (s) => new Date(s + 'T00:00:00'),
  addDays: (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; },
  addMonths: (d, n) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; },
  diffDays: (a, b) => Math.round((b - a) / 86400000),
  fmtMonth: (d) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
  fmtDate: (d) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
  startOfMonth: (d) => new Date(d.getFullYear(), d.getMonth(), 1),
  startOfWeek: (d) => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; },
  monthsBetween: (a, b) => {
    const res = [];
    let cur = new Date(a.getFullYear(), a.getMonth(), 1);
    while (cur <= b) { res.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    return res;
  },
  weeksBetween: (a, b) => {
    const res = [];
    let cur = dateUtil.startOfWeek(a);
    while (cur <= b) { res.push(new Date(cur)); cur.setDate(cur.getDate() + 7); }
    return res;
  },
  // 今日の日付（固定: デモ用）
  today: () => new Date(2026, 3, 18), // 2026/04/18
};

// 担当者→色（アバター用）
const AVATAR_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635',
  '#34d399', '#22d3ee', '#60a5fa', '#818cf8',
  '#c084fc', '#f472b6',
];
export const avatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
export const initials = (name) => {
  const parts = name.split(/\s+/);
  return parts[0][0] || '?';
};

export const STATUS_META = {
  'planned':     { label: '予定',   ja: '予定' },
  'in-progress': { label: '進行中', ja: '進行中' },
  'done':        { label: '完了',   ja: '完了' },
  'blocked':     { label: '保留',   ja: '保留' },
};
export const PRIORITY_META = {
  'high': { label: '高' },
  'med':  { label: '中' },
  'low':  { label: '低' },
};
