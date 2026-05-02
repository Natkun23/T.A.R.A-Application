// database/db.ts
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("tara.db");

// ── Initialize tables ────────────────────────────────────────────────────────
export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_no TEXT UNIQUE NOT NULL,
      emp_no TEXT UNIQUE NOT NULL,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      suffix TEXT,
      position TEXT,
      sign_on TEXT,
      sign_off TEXT,
      contract_duration TEXT,
      is_archived INTEGER DEFAULT 0,
      archived_at TEXT DEFAULT NULL
    );
  `);

  // Migrate existing installs — safe to run repeatedly, errors are swallowed
  try {
    db.execSync(`ALTER TABLE employees ADD COLUMN middle_name TEXT;`);
  } catch {}
  try {
    db.execSync(`ALTER TABLE employees ADD COLUMN suffix TEXT;`);
  } catch {}
  try {
    db.execSync(
      `ALTER TABLE employees ADD COLUMN is_archived INTEGER DEFAULT 0;`,
    );
  } catch {}
  try {
    db.execSync(
      `ALTER TABLE employees ADD COLUMN archived_at TEXT DEFAULT NULL;`,
    );
  } catch {}

  db.execSync(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_no TEXT NOT NULL,
      emp_no TEXT NOT NULL,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time_in TEXT,
      time_out TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at TEXT NOT NULL,
      pushed INTEGER DEFAULT 0,
      pulled INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      status TEXT NOT NULL
    );
  `);

  db.execSync(`
    DELETE FROM sync_history 
    WHERE synced_at < datetime('now', '-30 days');
  `);

  // Auto-purge employees archived for more than 6 months
  purgeExpiredArchives(6);
};

// ── Employee CRUD ────────────────────────────────────────────────────────────
export const addEmployee = (
  card_no: string,
  emp_no: string,
  last_name: string,
  first_name: string,
  middle_name: string,
  suffix: string,
  position: string,
  sign_on: string,
  sign_off: string,
  contract_duration: string,
) => {
  db.runSync(
    `INSERT INTO employees (card_no, emp_no, last_name, first_name, middle_name, suffix, position, sign_on, sign_off, contract_duration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      card_no,
      emp_no,
      last_name,
      first_name,
      middle_name,
      suffix,
      position,
      sign_on,
      sign_off,
      contract_duration,
    ],
  );
};

/** Returns only active (non-archived) employees. */
export const getAllEmployees = () => {
  return db.getAllSync(
    "SELECT * FROM employees WHERE is_archived = 0 OR is_archived IS NULL ORDER BY last_name ASC;",
  );
};

/** Returns all archived employees. */
export const getArchivedEmployees = () => {
  return db.getAllSync(
    "SELECT * FROM employees WHERE is_archived = 1 ORDER BY archived_at DESC;",
  );
};

export const getEmployeeByCardNo = (cardNo: string) => {
  return db.getFirstSync(
    "SELECT * FROM employees WHERE card_no = ? AND (is_archived = 0 OR is_archived IS NULL);",
    [cardNo],
  );
};

export const getEmployeeByEmpNo = (empNo: string) => {
  return db.getFirstSync(
    "SELECT * FROM employees WHERE emp_no = ? AND (is_archived = 0 OR is_archived IS NULL);",
    [empNo],
  );
};

export const updateEmployee = (
  emp_no: string,
  card_no: string,
  last_name: string,
  first_name: string,
  middle_name: string,
  suffix: string,
  position: string,
  sign_on: string,
  sign_off: string,
  contract_duration: string,
) => {
  db.runSync(
    "UPDATE employees SET card_no=?, last_name=?, first_name=?, middle_name=?, suffix=?, position=?, sign_on=?, sign_off=?, contract_duration=? WHERE emp_no=?",
    [
      card_no,
      last_name,
      first_name,
      middle_name,
      suffix,
      position,
      sign_on,
      sign_off,
      contract_duration,
      emp_no,
    ],
  );
};

/**
 * Soft-delete: marks the employee as archived instead of removing the row.
 * The record will be permanently purged after `archiveMonths` months (default 6).
 */
export const archiveEmployee = (emp_no: string) => {
  const archivedAt = new Date().toISOString();
  db.runSync(
    "UPDATE employees SET is_archived = 1, archived_at = ? WHERE emp_no = ?;",
    [archivedAt, emp_no],
  );
};

/**
 * Restores an archived employee back to active status.
 * Use this when a previously archived employee returns.
 */
export const restoreEmployee = (emp_no: string) => {
  db.runSync(
    "UPDATE employees SET is_archived = 0, archived_at = NULL WHERE emp_no = ?;",
    [emp_no],
  );
};

/**
 * Permanently removes employees that have been archived for longer than
 * `monthsOld` months. Called automatically on app init.
 */
export const purgeExpiredArchives = (monthsOld: number = 6) => {
  // Build the modifier string first — SQLite datetime() does not support
  // parameter binding inside the modifier string itself
  const modifier = `-${monthsOld} months`;
  db.runSync(
    `DELETE FROM employees
     WHERE is_archived = 1
       AND archived_at IS NOT NULL
       AND archived_at < datetime('now', ?);`,
    [modifier],
  );
};

/**
 * Hard-delete — kept for internal/admin use only.
 * Prefer archiveEmployee() for normal flows.
 */
export const deleteEmployee = (emp_no: string) => {
  db.runSync("DELETE FROM employees WHERE emp_no = ?;", [emp_no]);
};

// ── Attendance logs ──────────────────────────────────────────────────────────
export const addAttendanceLog = (
  card_no: string,
  emp_no: string,
  last_name: string,
  first_name: string,
  date: string,
  time_in: string,
) => {
  db.runSync(
    "INSERT INTO attendance_logs (card_no, emp_no, last_name, first_name, date, time_in) VALUES (?, ?, ?, ?, ?, ?)",
    [card_no, emp_no, last_name, first_name, date, time_in],
  );
};

export const updateTimeOut = (
  card_no: string,
  date: string,
  time_out: string,
) => {
  db.runSync(
    "UPDATE attendance_logs SET time_out=? WHERE card_no=? AND date=?",
    [time_out, card_no, date],
  );
};

export const updateAttendanceLog = (
  id: number,
  time_in: string,
  time_out: string,
) => {
  db.runSync("UPDATE attendance_logs SET time_in=?, time_out=? WHERE id=?", [
    time_in,
    time_out,
    id,
  ]);
};

export const getAllAttendanceLogs = () => {
  return db.getAllSync("SELECT * FROM attendance_logs ORDER BY date DESC;");
};

export const getAttendanceLogByCardAndDate = (
  card_no: string,
  date: string,
) => {
  return db.getFirstSync(
    "SELECT * FROM attendance_logs WHERE card_no = ? AND date = ?;",
    [card_no, date],
  );
};

// ── Attendance lazy-load helpers ─────────────────────────────────────────────

/** All distinct years that have attendance records */
export const getAttendanceYears = (): string[] => {
  const rows = db.getAllSync(
    "SELECT DISTINCT strftime('%Y', date) AS yr FROM attendance_logs ORDER BY yr DESC;",
  ) as any[];
  return rows.map((r) => r.yr);
};

/** All distinct months (YYYY-MM) within a given year */
export const getAttendanceMonths = (year: string): string[] => {
  const rows = db.getAllSync(
    "SELECT DISTINCT strftime('%Y-%m', date) AS ym FROM attendance_logs WHERE strftime('%Y', date) = ? ORDER BY ym DESC;",
    [year],
  ) as any[];
  return rows.map((r) => r.ym);
};

/** All distinct dates (YYYY-MM-DD) within a given month */
export const getAttendanceDays = (yearMonth: string): string[] => {
  const rows = db.getAllSync(
    "SELECT DISTINCT date FROM attendance_logs WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC;",
    [yearMonth],
  ) as any[];
  return rows.map((r) => r.date);
};

/** All logs for a specific date */
export const getLogsByDate = (date: string): any[] => {
  return db.getAllSync(
    "SELECT * FROM attendance_logs WHERE date = ? ORDER BY time_in ASC;",
    [date],
  ) as any[];
};

/** Count of logs per month — safe version using getAllSync */
export const getLogCountByMonth = (yearMonth: string): number => {
  const rows = db.getAllSync(
    "SELECT COUNT(*) AS cnt FROM attendance_logs WHERE strftime('%Y-%m', date) = ?;",
    [yearMonth],
  ) as any[];
  return rows[0]?.cnt ?? 0;
};

/** Today's logs */
export const getTodayLogs = (today: string): any[] => {
  return db.getAllSync(
    "SELECT * FROM attendance_logs WHERE date = ? ORDER BY time_in ASC;",
    [today],
  ) as any[];
};

/** All logs for the current month except today, grouped by day */
export const getCurrentMonthLogsExcludingToday = (
  yearMonth: string,
  today: string,
): { date: string; logs: any[] }[] => {
  const rows = db.getAllSync(
    "SELECT DISTINCT date FROM attendance_logs WHERE strftime('%Y-%m', date) = ? AND date != ? ORDER BY date DESC;",
    [yearMonth, today],
  ) as any[];
  return rows.map((r) => ({ date: r.date, logs: getLogsByDate(r.date) }));
};

/** Logs grouped by day for archive modal */
export const getLogsGroupedByDay = (
  yearMonth: string,
): { date: string; logs: any[] }[] => {
  const rows = db.getAllSync(
    "SELECT DISTINCT date FROM attendance_logs WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC;",
    [yearMonth],
  ) as any[];
  return rows.map((r) => ({ date: r.date, logs: getLogsByDate(r.date) }));
};

// ── Sync History ─────────────────────────────────────────────────────────────
export const addSyncLog = (
  pushed: number,
  pulled: number,
  errors: number,
  status: string,
) => {
  db.runSync(
    `INSERT INTO sync_history (synced_at, pushed, pulled, errors, status)
     VALUES (datetime('now', 'localtime'), ?, ?, ?, ?)`,
    [pushed, pulled, errors, status],
  );
};

export const getSyncHistory = () => {
  return db.getAllSync(
    "SELECT * FROM sync_history ORDER BY synced_at DESC LIMIT 30;",
  );
};

export default db;
