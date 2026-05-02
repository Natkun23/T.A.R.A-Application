// database/sync.ts
import {
  addAttendanceLog,
  addEmployee,
  getAllAttendanceLogs,
  getAllEmployees,
  getEmployeeByEmpNo,
  updateTimeOut,
} from "./db";
import {
  deleteEmployeeCloud,
  fetchAllAttendanceLogs,
  fetchAllEmployees,
  uploadAttendanceLog,
  uploadEmployee,
} from "./firebase";

export type SyncResult = {
  pushed: number;
  pulled: number;
  errors: string[];
};

export const syncEmployees = async (): Promise<SyncResult> => {
  const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };

  const localEmployees = getAllEmployees() as any[];
  for (const emp of localEmployees) {
    try {
      await uploadEmployee({
        card_no: emp.card_no,
        emp_no: emp.emp_no,
        last_name: emp.last_name,
        first_name: emp.first_name,
        middle_name: emp.middle_name ?? "",
        suffix: emp.suffix ?? "",
        position: emp.position ?? "",
        sign_on: emp.sign_on ?? "",
        sign_off: emp.sign_off ?? "",
        contract_duration: emp.contract_duration ?? "",
      });
      result.pushed++;
    } catch (err: any) {
      result.errors.push(`Push failed for ${emp.emp_no}: ${err.message}`);
    }
  }

  try {
    const cloudEmployees = await fetchAllEmployees();
    for (const emp of cloudEmployees as any[]) {
      const exists = getEmployeeByEmpNo(emp.emp_no);
      if (!exists) {
        try {
          addEmployee(
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
          );
          result.pulled++;
        } catch (err: any) {
          result.errors.push(`Pull failed for ${emp.emp_no}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Cloud fetch failed: ${err.message}`);
  }

  return result;
};

export const syncAttendanceLogs = async (): Promise<SyncResult> => {
  const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };

  const localLogs = getAllAttendanceLogs() as any[];
  for (const log of localLogs) {
    try {
      await uploadAttendanceLog({
        card_no: log.card_no,
        emp_no: log.emp_no,
        last_name: log.last_name,
        first_name: log.first_name,
        date: log.date,
        time_in: log.time_in,
        time_out: log.time_out ?? undefined,
      });
      result.pushed++;
    } catch (err: any) {
      result.errors.push(
        `Push failed for log ${log.emp_no}/${log.date}: ${err.message}`,
      );
    }
  }

  try {
    const cloudLogs = await fetchAllAttendanceLogs();
    const localSet = new Set(
      localLogs.map((l: any) => `${l.emp_no}_${l.date}`),
    );
    for (const log of cloudLogs as any[]) {
      const key = `${log.emp_no}_${log.date}`;
      if (!localSet.has(key)) {
        try {
          addAttendanceLog(
            log.card_no,
            log.emp_no,
            log.last_name,
            log.first_name,
            log.date,
            log.time_in,
          );
          if (log.time_out) updateTimeOut(log.card_no, log.date, log.time_out);
          result.pulled++;
        } catch (err: any) {
          result.errors.push(
            `Pull failed for log ${log.emp_no}/${log.date}: ${err.message}`,
          );
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Cloud log fetch failed: ${err.message}`);
  }

  return result;
};

export type FullSyncResult = {
  employees: SyncResult;
  attendance: SyncResult;
  totalPushed: number;
  totalPulled: number;
  totalErrors: number;
};

export const syncAll = async (): Promise<FullSyncResult> => {
  const [employees, attendance] = await Promise.all([
    syncEmployees(),
    syncAttendanceLogs(),
  ]);
  return {
    employees,
    attendance,
    totalPushed: employees.pushed + attendance.pushed,
    totalPulled: employees.pulled + attendance.pulled,
    totalErrors: employees.errors.length + attendance.errors.length,
  };
};

export const syncSingleEmployee = async (emp_no: string): Promise<void> => {
  const employee = getEmployeeByEmpNo(emp_no) as any;
  if (!employee) return;
  await uploadEmployee({
    card_no: employee.card_no,
    emp_no: employee.emp_no,
    last_name: employee.last_name,
    first_name: employee.first_name,
    middle_name: employee.middle_name ?? "",
    suffix: employee.suffix ?? "",
    position: employee.position ?? "",
    sign_on: employee.sign_on ?? "",
    sign_off: employee.sign_off ?? "",
    contract_duration: employee.contract_duration ?? "",
  });
};

export const syncDeleteEmployee = async (emp_no: string): Promise<void> => {
  await deleteEmployeeCloud(emp_no);
};
