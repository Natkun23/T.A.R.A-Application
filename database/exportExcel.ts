// database/exportExcel.ts
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import XLSX from "xlsx-js-style";
import { getAllAttendanceLogs, getAllEmployees } from "./db";

// ── Timestamp helpers ─────────────────────────────────────────────────────
const getDateStamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getFullExportDate = () =>
  new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Styles ────────────────────────────────────────────────────────────────
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
  fill: { fgColor: { rgb: "1E3A5F" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "BFDBFE" } },
    bottom: { style: "thin", color: { rgb: "BFDBFE" } },
    left: { style: "thin", color: { rgb: "BFDBFE" } },
    right: { style: "thin", color: { rgb: "BFDBFE" } },
  },
};

const ALT_ROW_STYLE = {
  fill: { fgColor: { rgb: "EBF5FF" } },
  font: { color: { rgb: "1E3A5F" }, sz: 11 },
  border: {
    top: { style: "thin", color: { rgb: "BFDBFE" } },
    bottom: { style: "thin", color: { rgb: "BFDBFE" } },
    left: { style: "thin", color: { rgb: "BFDBFE" } },
    right: { style: "thin", color: { rgb: "BFDBFE" } },
  },
};

const ROW_STYLE = {
  fill: { fgColor: { rgb: "FFFFFF" } },
  font: { color: { rgb: "1E3A5F" }, sz: 11 },
  border: {
    top: { style: "thin", color: { rgb: "BFDBFE" } },
    bottom: { style: "thin", color: { rgb: "BFDBFE" } },
    left: { style: "thin", color: { rgb: "BFDBFE" } },
    right: { style: "thin", color: { rgb: "BFDBFE" } },
  },
};

const TITLE_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 18 },
  fill: { fgColor: { rgb: "1E3A5F" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const SUBTITLE_STYLE = {
  font: { color: { rgb: "FFFFFF" }, sz: 11, italic: true },
  fill: { fgColor: { rgb: "3B6EA5" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const DATE_STYLE = {
  font: { color: { rgb: "3B6EA5" }, sz: 10, italic: true },
  fill: { fgColor: { rgb: "EBF5FF" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const applyStyle = (ws: XLSX.WorkSheet, cellRef: string, style: any) => {
  if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
  ws[cellRef].s = style;
};

// ── Sheet builder ─────────────────────────────────────────────────────────
const buildSheet = (
  title: string,
  subtitle: string,
  headers: string[],
  rows: any[][],
  exportDate: string,
  dateRange?: string,
): XLSX.WorkSheet => {
  const ws: XLSX.WorkSheet = {};
  const colCount = headers.length;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  ];

  // Row 0 — Main title
  ws["A1"] = { t: "s", v: `T.A.R.A — ${title}` };
  applyStyle(ws, "A1", TITLE_STYLE);

  // Row 1 — Subtitle
  ws["A2"] = { t: "s", v: subtitle };
  applyStyle(ws, "A2", SUBTITLE_STYLE);

  // Row 2 — Export date
  ws["A3"] = { t: "s", v: `Exported: ${exportDate}` };
  applyStyle(ws, "A3", DATE_STYLE);

  // Row 3 — Date range (if any) or blank
  ws["A4"] = { t: "s", v: dateRange ? `Date Range: ${dateRange}` : "" };
  applyStyle(ws, "A4", DATE_STYLE);

  // Row 4 — Headers
  headers.forEach((h, c) => {
    const cellRef = XLSX.utils.encode_cell({ r: 4, c });
    ws[cellRef] = { t: "s", v: h };
    applyStyle(ws, cellRef, HEADER_STYLE);
  });

  // Rows 5+ — Data
  if (rows.length === 0) {
    // Empty state row
    const cellRef = XLSX.utils.encode_cell({ r: 5, c: 0 });
    ws[cellRef] = { t: "s", v: "No records found." };
    applyStyle(ws, cellRef, DATE_STYLE);
  } else {
    rows.forEach((row, rowIdx) => {
      row.forEach((val, c) => {
        const cellRef = XLSX.utils.encode_cell({ r: 5 + rowIdx, c });
        ws[cellRef] = { t: "s", v: String(val ?? "") };
        applyStyle(ws, cellRef, rowIdx % 2 === 0 ? ALT_ROW_STYLE : ROW_STYLE);
      });
    });
  }

  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 6, 18) }));
  ws["!rows"] = [
    { hpt: 36 }, // title
    { hpt: 22 }, // subtitle
    { hpt: 18 }, // export date
    { hpt: 18 }, // date range
    { hpt: 26 }, // headers
  ];

  const lastRow = 5 + Math.max(rows.length - 1, 0);
  ws["!ref"] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastRow, c: colCount - 1 },
  );

  return ws;
};

// ── Share helper ──────────────────────────────────────────────────────────
const shareFile = async (fileName: string, wbOut: string) => {
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, wbOut, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(filePath, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: `Save ${fileName}`,
    UTI: "com.microsoft.excel.xlsx",
  });
};

// ── Export Options ────────────────────────────────────────────────────────

export type ExportOptions = {
  type: "employees" | "attendance" | "both";
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

const EMP_HEADERS = [
  "Card No (Scan ID)",
  "Employee No",
  "Last Name",
  "First Name",
  "Middle Name",
  "Suffix",
  "Position",
  "Sign On Date",
  "Sign Off Date",
  "Contract Duration",
];

const ATT_HEADERS = [
  "Card No",
  "Employee No",
  "Last Name",
  "First Name",
  "Date",
  "Time In",
  "Time Out",
];

const buildDateRangeLabel = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return undefined;
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `From ${startDate}`;
  return `Until ${endDate}`;
};

export const exportEmployees = async (
  options?: ExportOptions,
): Promise<void> => {
  const employees = getAllEmployees() as any[];
  const exportDate = getFullExportDate();
  const dateStamp = getDateStamp();

  const empRows = employees.map((emp) => [
    emp.card_no,
    emp.emp_no,
    emp.last_name,
    emp.first_name,
    emp.middle_name ?? "",
    emp.suffix ?? "",
    emp.position ?? "",
    emp.sign_on ?? "",
    emp.sign_off ?? "",
    emp.contract_duration ?? "",
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(
      "Employee Records",
      "Time and Attendance Recording Application",
      EMP_HEADERS,
      empRows,
      exportDate,
    ),
    "Employees",
  );

  const wbOut = XLSX.write(wb, {
    type: "base64",
    bookType: "xlsx",
    cellStyles: true,
  });
  await shareFile(`TARA_Employees_${dateStamp}.xlsx`, wbOut);
};

export const exportAttendance = async (
  options?: ExportOptions,
): Promise<void> => {
  const allLogs = getAllAttendanceLogs() as any[];
  const exportDate = getFullExportDate();
  const dateStamp = getDateStamp();

  // Filter by date range if provided
  let filteredLogs = allLogs;
  if (options?.startDate) {
    filteredLogs = filteredLogs.filter((l) => l.date >= options.startDate!);
  }
  if (options?.endDate) {
    filteredLogs = filteredLogs.filter((l) => l.date <= options.endDate!);
  }

  const dateRangeLabel = buildDateRangeLabel(
    options?.startDate,
    options?.endDate,
  );

  const attRows = filteredLogs.map((log) => [
    log.card_no,
    log.emp_no,
    log.last_name,
    log.first_name,
    log.date,
    log.time_in ?? "",
    log.time_out ?? "",
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(
      "Attendance Logs",
      "Time and Attendance Recording Application",
      ATT_HEADERS,
      attRows,
      exportDate,
      dateRangeLabel,
    ),
    "Attendance Logs",
  );

  // Filename includes date range if filtered
  const rangeSuffix = options?.startDate
    ? `_${options.startDate}_to_${options.endDate ?? dateStamp}`
    : `_${dateStamp}`;

  const wbOut = XLSX.write(wb, {
    type: "base64",
    bookType: "xlsx",
    cellStyles: true,
  });
  await shareFile(`TARA_Attendance${rangeSuffix}.xlsx`, wbOut);
};

export const exportBoth = async (options?: ExportOptions): Promise<void> => {
  const employees = getAllEmployees() as any[];
  const allLogs = getAllAttendanceLogs() as any[];
  const exportDate = getFullExportDate();
  const dateStamp = getDateStamp();

  let filteredLogs = allLogs;
  if (options?.startDate) {
    filteredLogs = filteredLogs.filter((l) => l.date >= options.startDate!);
  }
  if (options?.endDate) {
    filteredLogs = filteredLogs.filter((l) => l.date <= options.endDate!);
  }

  const dateRangeLabel = buildDateRangeLabel(
    options?.startDate,
    options?.endDate,
  );

  const empRows = employees.map((emp) => [
    emp.card_no,
    emp.emp_no,
    emp.last_name,
    emp.first_name,
    emp.middle_name ?? "",
    emp.suffix ?? "",
    emp.position ?? "",
    emp.sign_on ?? "",
    emp.sign_off ?? "",
    emp.contract_duration ?? "",
  ]);

  const attRows = filteredLogs.map((log) => [
    log.card_no,
    log.emp_no,
    log.last_name,
    log.first_name,
    log.date,
    log.time_in ?? "",
    log.time_out ?? "",
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(
      "Employee Records",
      "Time and Attendance Recording Application",
      EMP_HEADERS,
      empRows,
      exportDate,
    ),
    "Employees",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(
      "Attendance Logs",
      "Time and Attendance Recording Application",
      ATT_HEADERS,
      attRows,
      exportDate,
      dateRangeLabel,
    ),
    "Attendance Logs",
  );

  const rangeSuffix = options?.startDate
    ? `_${options.startDate}_to_${options.endDate ?? dateStamp}`
    : `_${dateStamp}`;

  const wbOut = XLSX.write(wb, {
    type: "base64",
    bookType: "xlsx",
    cellStyles: true,
  });
  await shareFile(`TARA_Full_Export${rangeSuffix}.xlsx`, wbOut);
};
