import ExcelJS from "exceljs";

function getMonthsBetween(startYear, startMonth, endYear, endMonth) {
  const months = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m, label: `${y}/${String(m).padStart(2, "0")}` });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

function hexToArgb(hex) {
  const clean = hex.replace("#", "");
  if (clean.length === 6) return "FF" + clean.toUpperCase();
  if (clean.length === 8) return clean.toUpperCase();
  return "FF4472C4";
}

function getContrastColor(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "FF000000" : "FFFFFFFF";
}

function taskFallsInMonth(task, monthYear, monthNum) {
  if (!task.startDate || !task.endDate) return false;
  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);
  const monthStart = new Date(monthYear, monthNum - 1, 1);
  const monthEnd = new Date(monthYear, monthNum, 0);
  return taskStart <= monthEnd && taskEnd >= monthStart;
}

function milestoneFallsInMonth(task, monthYear, monthNum) {
  if (task.type !== "milestone" || !task.dates) return false;
  return task.dates.some((d) => {
    const date = new Date(d.date);
    return date.getFullYear() === monthYear && date.getMonth() + 1 === monthNum;
  });
}

function flattenTasks(tasks, parentId, depth) {
  const childMap = new Map();
  tasks.forEach((t) => {
    const pid = t.parentId || "__root__";
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid).push(t);
  });

  const result = [];
  function walk(pid, d) {
    const children = childMap.get(pid) || [];
    for (const task of children) {
      result.push({ task, depth: d });
      walk(task.id, d + 1);
    }
  }
  walk(parentId, depth);
  return result;
}

export async function exportToExcel(projects, viewRange) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ガントチャート");

  const months = getMonthsBetween(
    viewRange.startYear,
    viewRange.startMonth,
    viewRange.endYear,
    viewRange.endMonth
  );

  const fixedHeaders = ["タスク名", "担当者", "場所", "開始日", "終了日", "備考"];
  const headerRow = sheet.addRow([...fixedHeaders, ...months.map((m) => m.label)]);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 16;
  for (let i = 0; i < months.length; i++) {
    sheet.getColumn(7 + i).width = 10;
  }

  for (const project of projects) {
    const projectCells = [project.name, "", "", "", "", "", ...months.map(() => "")];
    const projectRow = sheet.addRow(projectCells);
    projectRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8F0FE" },
      };
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const flatTasks = flattenTasks(project.tasks, "__root__", 0);

    for (const { task, depth } of flatTasks) {
      const indent = "\u3000".repeat(depth);
      const taskName = indent + (task.name || "");
      const assignee = task.assignee || "";
      const location = task.location || "";
      const startDate = task.startDate || "";
      const endDate = task.endDate || "";
      const notes = task.notes || "";

      const taskColor = task.color || "#4472C4";
      const isMilestone = task.type === "milestone";

      const monthCells = months.map((m) => {
        if (isMilestone && milestoneFallsInMonth(task, m.year, m.month)) {
          return "▼";
        }
        return "";
      });

      const row = sheet.addRow([taskName, assignee, location, startDate, endDate, notes, ...monthCells]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      months.forEach((m, idx) => {
        const cell = row.getCell(7 + idx);
        if (isMilestone && milestoneFallsInMonth(task, m.year, m.month)) {
          cell.font = { bold: true, color: { argb: getContrastColor(taskColor) } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: hexToArgb(taskColor) },
          };
          cell.alignment = { horizontal: "center" };
        } else if (!isMilestone && taskFallsInMonth(task, m.year, m.month)) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: hexToArgb(taskColor) },
          };
        }
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gantt-export.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
