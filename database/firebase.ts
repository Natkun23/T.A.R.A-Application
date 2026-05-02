// database/firebase.ts
import { initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCHAkc8GidR8BwzbZaNqpKmNOi5lujilQA",
  authDomain: "tara-attendance.firebaseapp.com",
  projectId: "tara-attendance",
  storageBucket: "tara-attendance.firebasestorage.app",
  messagingSenderId: "486440755648",
  appId: "1:486440755648:web:b8e9daceb297feee5f6825",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const employeesCol = () => collection(db, "employees");
export const attendanceCol = () => collection(db, "attendance_logs");

// ── Employee helpers ─────────────────────────────────────────────────────────
export const uploadEmployee = async (employee: {
  card_no: string;
  emp_no: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  suffix: string;
  position: string;
  sign_on: string;
  sign_off: string;
  contract_duration: string;
}) => {
  const ref = doc(db, "employees", employee.emp_no);
  await setDoc(ref, { ...employee, updatedAt: serverTimestamp() });
};

export const fetchAllEmployees = async () => {
  const snap = await getDocs(employeesCol());
  return snap.docs.map((d) => d.data());
};

export const deleteEmployeeCloud = async (emp_no: string) => {
  await deleteDoc(doc(db, "employees", emp_no));
};

// ── Attendance helpers ───────────────────────────────────────────────────────
export const uploadAttendanceLog = async (log: {
  card_no: string;
  emp_no: string;
  last_name: string;
  first_name: string;
  date: string;
  time_in: string;
  time_out?: string;
}) => {
  const docId = `${log.emp_no}_${log.date}`;
  const ref = doc(db, "attendance_logs", docId);
  await setDoc(ref, { ...log, updatedAt: serverTimestamp() }, { merge: true });
};

export const fetchAllAttendanceLogs = async () => {
  const snap = await getDocs(attendanceCol());
  return snap.docs.map((d) => d.data());
};

export const updateTimeOutCloud = async (
  emp_no: string,
  date: string,
  time_out: string,
) => {
  const docId = `${emp_no}_${date}`;
  const ref = doc(db, "attendance_logs", docId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { time_out, updatedAt: serverTimestamp() });
  }
};

export const updateAttendanceLogCloud = async (
  emp_no: string,
  date: string,
  time_in: string,
  time_out: string,
) => {
  const docId = `${emp_no}_${date}`;
  const ref = doc(db, "attendance_logs", docId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { time_in, time_out, updatedAt: serverTimestamp() });
  }
};
