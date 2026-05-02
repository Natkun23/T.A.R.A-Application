// app/data.tsx
import ArchiveConfirmModal from "@/components/modals/ArchiveConfirmModal";
import WarningModal from "@/components/modals/WarningModal";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addSyncLog,
  archiveEmployee,
  getAllAttendanceLogs,
  getAllEmployees,
  getAttendanceMonths,
  getAttendanceYears,
  getCurrentMonthLogsExcludingToday,
  getLogCountByMonth,
  getLogsGroupedByDay,
  getSyncHistory,
  getTodayLogs,
  updateAttendanceLog,
  updateEmployee,
} from "../database/db";
import {
  ExportOptions,
  exportAttendance,
  exportBoth,
  exportEmployees,
} from "../database/exportExcel";
import { updateAttendanceLogCloud } from "../database/firebase";
import { FullSyncResult, syncAll, syncSingleEmployee } from "../database/sync";

const STORAGE_KEY_LAST_SYNC = "tara_last_sync_time";
const STORAGE_KEY_SYNC_SUMMARY = "tara_last_sync_summary";

type SyncStatus = "idle" | "synced" | "syncing" | "error";

export default function DataScreen() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const [employees, setEmployees] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"employees" | "logs">("employees");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<string>("");
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  // ── Attendance State ────────────────────────────────────────────────────
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [thisMonthGroups, setThisMonthGroups] = useState<
    { date: string; logs: any[]; expanded: boolean }[]
  >([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveYears, setArchiveYears] = useState<string[]>([]);
  const [archiveSelectedYear, setArchiveSelectedYear] = useState<string | null>(
    null,
  );
  const [archiveMonths, setArchiveMonths] = useState<string[]>([]);
  const [archiveSelectedMonth, setArchiveSelectedMonth] = useState<
    string | null
  >(null);
  const [archiveDayGroups, setArchiveDayGroups] = useState<
    { date: string; logs: any[]; expanded: boolean }[]
  >([]);
  const [archiveView, setArchiveView] = useState<"years" | "months" | "days">(
    "years",
  );

  // ── Quick Action State (long press) ────────────────────────────────────
  const [longPressedEmployee, setLongPressedEmployee] = useState<any>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showQuickEditWarning, setShowQuickEditWarning] = useState(false);
  const [dontAskAgainQuickEdit, setDontAskAgainQuickEdit] = useState(false);
  const [pendingQuickEditEmployee, setPendingQuickEditEmployee] = useState<any>(null);
  const warningDismissedQE = useRef(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showQuickArchiveConfirm, setShowQuickArchiveConfirm] = useState(false);
  const [qeEmpNo, setQeEmpNo] = useState("");
  const [qeScanId, setQeScanId] = useState("");
  const [qeLastName, setQeLastName] = useState("");
  const [qeFirstName, setQeFirstName] = useState("");
  const [qeMiddleName, setQeMiddleName] = useState("");
  const [qeSuffix, setQeSuffix] = useState("");
  const [qePosition, setQePosition] = useState("");
  const [qeSignOn, setQeSignOn] = useState("");
  const [qeSignOff, setQeSignOff] = useState("");
  const [qeContractDuration, setQeContractDuration] = useState("");
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // ── Export Modal State ──────────────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>("");
  const [exportEndDate, setExportEndDate] = useState<string>("");
  const [showExportStartPicker, setShowExportStartPicker] = useState(false);
  const [showExportEndPicker, setShowExportEndPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ── Edit Log State ──────────────────────────────────────────────────────
  const [editingLog, setEditingLog] = useState<any>(null);
  const [editTimeIn, setEditTimeIn] = useState<string>("");
  const [editTimeOut, setEditTimeOut] = useState<string>("");
  const [showEditTimeInPicker, setShowEditTimeInPicker] = useState(false);
  const [showEditTimeOutPicker, setShowEditTimeOutPicker] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);

  const loadEmployees = () => setEmployees(getAllEmployees() as any[]);
  const loadLogs = () => setLogs(getAllAttendanceLogs() as any[]);
  const loadSyncHistory = () => setSyncHistory(getSyncHistory() as any[]);

  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const getCurrentYearMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const loadAttendanceTab = () => {
    const today = getTodayString();
    const ym = getCurrentYearMonth();
    setTodayLogs(getTodayLogs(today));
    const monthGroups = getCurrentMonthLogsExcludingToday(ym, today).map(
      (g) => ({
        ...g,
        expanded: false,
      }),
    );
    setThisMonthGroups(monthGroups);
  };

  const toggleThisMonthDay = (date: string) => {
    setThisMonthGroups((prev) =>
      prev.map((g) => (g.date === date ? { ...g, expanded: !g.expanded } : g)),
    );
  };

  const loadSyncInfo = async () => {
    try {
      const savedTime = await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC);
      const savedSummary = await AsyncStorage.getItem(STORAGE_KEY_SYNC_SUMMARY);
      if (savedTime) {
        setLastSync(savedTime);
        setSyncStatus("synced");
      }
      if (savedSummary) setSyncSummary(savedSummary);
    } catch {}
  };

  useEffect(() => {
    loadEmployees();
    loadLogs();
    loadAttendanceTab();
    loadSyncInfo();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") loadAttendanceTab();
  }, [activeTab]);

  const handleLongPress = (employee: any) => {
    setLongPressedEmployee(employee);
    setShowQuickActions(true);
  };

  const openQuickEdit = () => {
    setShowQuickActions(false);
    if (warningDismissedQE.current) {
      proceedToQuickEdit(longPressedEmployee);
    } else {
      setPendingQuickEditEmployee(longPressedEmployee);
      setShowQuickEditWarning(true);
    }
  };

  const proceedToQuickEdit = (employee: any) => {
    const e = employee;
    setQeEmpNo(e.emp_no ?? "");
    setQeScanId(e.card_no ?? "");
    setQeLastName(e.last_name ?? "");
    setQeFirstName(e.first_name ?? "");
    setQeMiddleName(e.middle_name ?? "");
    setQeSuffix(e.suffix ?? "");
    setQePosition(e.position ?? "");
    setQeSignOn(e.sign_on ?? "");
    setQeSignOff(e.sign_off ?? "");
    setQeContractDuration(e.contract_duration ?? "");
    setShowQuickEdit(true);
  };

  const handleQuickEditWarningOk = () => {
    if (dontAskAgainQuickEdit) warningDismissedQE.current = true;
    setShowQuickEditWarning(false);
    if (pendingQuickEditEmployee) proceedToQuickEdit(pendingQuickEditEmployee);
    setPendingQuickEditEmployee(null);
  };

  const handleQuickEditWarningCancel = () => {
    setShowQuickEditWarning(false);
    setPendingQuickEditEmployee(null);
  };

  const handleQuickSave = async () => {
    setIsSavingEmployee(true);
    try {
      updateEmployee(
        qeEmpNo,
        qeScanId,
        qeLastName,
        qeFirstName,
        qeMiddleName,
        qeSuffix,
        qePosition,
        qeSignOn,
        qeSignOff,
        qeContractDuration,
      );
      if (isOnline) {
        try {
          await syncSingleEmployee(qeEmpNo);
        } catch {}
      }
      loadEmployees();
      setShowQuickEdit(false);
      setLongPressedEmployee(null);
      Alert.alert("Saved", "Employee updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save changes.");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleQuickArchive = () => {
    setShowQuickActions(false);
    setShowQuickArchiveConfirm(true);
  };

  const confirmQuickArchive = () => {
    if (!longPressedEmployee) return;
    try {
      archiveEmployee(longPressedEmployee.emp_no);
      loadEmployees();
      setShowQuickArchiveConfirm(false);
      setLongPressedEmployee(null);
      Alert.alert(
        "Archived",
        `${longPressedEmployee.last_name}, ${longPressedEmployee.first_name} has been archived.\n\nRecord kept for 6 months.`,
      );
    } catch {
      Alert.alert("Error", "Failed to archive employee.");
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(
        "You're Offline",
        "Data is saved locally and will sync automatically when you're back online.",
        [{ text: "Got it" }],
      );
      return;
    }
    setSyncStatus("syncing");
    try {
      const result: FullSyncResult = await syncAll();
      const now = new Date();
      const timeStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      const summary =
        `↑ ${result.totalPushed} pushed  ↓ ${result.totalPulled} pulled` +
        (result.totalErrors > 0 ? `  ⚠ ${result.totalErrors} errors` : "");
      setLastSync(timeStr);
      setSyncSummary(summary);
      setSyncStatus(result.totalErrors > 0 ? "error" : "synced");
      addSyncLog(
        result.totalPushed,
        result.totalPulled,
        result.totalErrors,
        result.totalErrors > 0 ? "error" : "success",
      );
      await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC, timeStr);
      await AsyncStorage.setItem(STORAGE_KEY_SYNC_SUMMARY, summary);
      loadEmployees();
      loadLogs();
      if (result.totalErrors > 0) {
        Alert.alert(
          "Sync completed with errors",
          [...result.employees.errors, ...result.attendance.errors].join("\n"),
        );
      }
    } catch (err: any) {
      setSyncStatus("error");
      Alert.alert("Sync Failed", err.message ?? "Unknown error");
    }
  };

  const handleExport = async (type: "employees" | "attendance" | "both") => {
    setIsExporting(true);
    const options: ExportOptions = {
      type,
      startDate: exportStartDate || undefined,
      endDate: exportEndDate || undefined,
    };
    try {
      if (type === "employees") await exportEmployees(options);
      else if (type === "attendance") await exportAttendance(options);
      else await exportBoth(options);
      setShowExportModal(false);
    } catch (err: any) {
      Alert.alert("Export Failed", err.message ?? "Unknown error");
    } finally {
      setIsExporting(false);
    }
  };

  const [warningLog, setWarningLog] = useState<any>(null);

  const openEditLog = (log: any) => {
    setWarningLog(log);
  };

  const confirmEditLog = () => {
    if (!warningLog) return;
    setEditingLog(warningLog);
    setEditTimeIn(warningLog.time_in || "");
    setEditTimeOut(warningLog.time_out || "");
    setWarningLog(null);
  };

  const handleSaveEditLog = async () => {
    if (!editingLog) return;
    if (!editTimeIn) {
      Alert.alert("Validation", "Time In cannot be empty.");
      return;
    }
    setIsSavingLog(true);
    try {
      // Save to SQLite
      updateAttendanceLog(editingLog.id, editTimeIn, editTimeOut);
      // Sync to Firebase
      try {
        await updateAttendanceLogCloud(
          editingLog.emp_no,
          editingLog.date,
          editTimeIn,
          editTimeOut,
        );
      } catch (firebaseErr: any) {
        console.warn("Firebase sync failed:", firebaseErr.message);
        // Don't block the user — local save succeeded
      }
      loadLogs();
      loadAttendanceTab();
      setEditingLog(null);
      Alert.alert("Saved", "Attendance log updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save changes.");
    } finally {
      setIsSavingLog(false);
    }
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const now = new Date();
    if (!timeStr) return now;
    const [h, m] = timeStr.split(":").map(Number);
    now.setHours(h || 0, m || 0, 0, 0);
    return now;
  };

  const formatTimePicked = (date: Date): string => {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
  };

  const syncColor = () => {
    if (syncStatus === "syncing") return "#f59e0b";
    if (syncStatus === "synced") return "#10b981";
    if (syncStatus === "error") return "#ef4444";
    return "#93c5fd";
  };

  const syncIcon = (): any => {
    if (syncStatus === "syncing") return "sync-outline";
    if (syncStatus === "synced") return "checkmark-circle-outline";
    if (syncStatus === "error") return "alert-circle-outline";
    return "cloud-outline";
  };

  const syncLabel = () => {
    if (syncStatus === "syncing") return "Syncing...";
    if (syncStatus === "synced") return "Sync Again";
    if (syncStatus === "error") return "Retry Sync";
    return "Sync to Cloud";
  };

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Database</Text>
          <Text style={styles.topBarSub}>
            {activeTab === "employees"
              ? `${employees.length} employee${employees.length !== 1 ? "s" : ""}`
              : `${logs.length} log${logs.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => {
            loadSyncHistory();
            setShowSyncHistory(true);
          }}
        >
          <Ionicons name="time-outline" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* ── Sync Status Bar ── */}
      <View style={styles.syncBar}>
        <View style={styles.syncBarLeft}>
          <Ionicons name={syncIcon()} size={14} color={syncColor()} />
          <Text style={[styles.syncBarText, { color: syncColor() }]}>
            {syncStatus === "idle"
              ? "Not synced yet"
              : syncStatus === "syncing"
                ? "Syncing..."
                : syncStatus === "synced"
                  ? `Synced · ${lastSync}`
                  : "Sync error"}
          </Text>
        </View>
        {syncSummary && syncStatus === "synced" ? (
          <Text style={styles.syncBarSummary}>{syncSummary}</Text>
        ) : null}
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "employees" && styles.tabActive]}
          onPress={() => setActiveTab("employees")}
        >
          <Ionicons
            name="people-outline"
            size={15}
            color={activeTab === "employees" ? "#1e3a5f" : "#93c5fd"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "employees" && styles.tabTextActive,
            ]}
          >
            Employees ({employees.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "logs" && styles.tabActive]}
          onPress={() => setActiveTab("logs")}
        >
          <Ionicons
            name="time-outline"
            size={15}
            color={activeTab === "logs" ? "#1e3a5f" : "#93c5fd"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "logs" && styles.tabTextActive,
            ]}
          >
            Attendance ({logs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {activeTab === "employees" ? (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.emp_no}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#bfdbfe" />
              <Text style={styles.emptyTitle}>No employees yet</Text>
              <Text style={styles.emptyHint}>
                Add employees to see them here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedEmployee(item)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={400}
              activeOpacity={0.75}
            >
              <View style={styles.cardAccent} />
              <View style={styles.cardIconWrap}>
                <Ionicons name="person-outline" size={20} color="#3b6ea5" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>
                  {item.last_name}, {item.first_name}{" "}
                  {item.middle_name ? item.middle_name[0] + "." : ""}{" "}
                  {item.suffix ?? ""}
                </Text>
                <Text style={styles.cardSub}>
                  {item.position || "No position"}
                </Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaPill}>
                    <Ionicons name="card-outline" size={11} color="#3b6ea5" />
                    <Text style={styles.metaText}>{item.emp_no}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons
                      name="calendar-outline"
                      size={11}
                      color="#3b6ea5"
                    />
                    <Text style={styles.metaText}>
                      {item.sign_on} – {item.sign_off}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#bfdbfe" />
            </TouchableOpacity>
          )}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
        >
          {/* ── TODAY'S ATTENDANCE ── */}
          <View style={styles.attSectionHeader}>
            <View style={styles.attSectionLeft}>
              <View style={styles.attTodayDot} />
              <Text style={styles.attSectionTitle}>Today</Text>
              <Text style={styles.attSectionDate}>
                {new Date().toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.attCountBadge}>
              <Text style={styles.attCountText}>{todayLogs.length}</Text>
            </View>
          </View>

          {todayLogs.length === 0 ? (
            <View style={styles.attEmptyBox}>
              <Ionicons name="time-outline" size={28} color="#bfdbfe" />
              <Text style={styles.attEmptyText}>No clock-ins yet today</Text>
            </View>
          ) : (
            todayLogs.map((item) => (
              <View key={`${item.emp_no}_${item.id}`} style={styles.logCard}>
                <View style={styles.logDateBadge}>
                  <Ionicons name="person-outline" size={12} color="#3b6ea5" />
                  <Text style={styles.logDateText}>{item.emp_no}</Text>
                  <TouchableOpacity
                    style={styles.logEditBtn}
                    onPress={() => openEditLog(item)}
                  >
                    <Ionicons name="create-outline" size={13} color="#3b6ea5" />
                    <Text style={styles.logEditBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.logBody}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logName}>
                      {item.last_name}, {item.first_name}
                    </Text>
                    <Text style={styles.logEmpNo}>{item.emp_no}</Text>
                  </View>
                  <View style={styles.logRight}>
                    <View style={styles.logTimeBadge}>
                      <Ionicons
                        name="log-in-outline"
                        size={12}
                        color="#10b981"
                      />
                      <Text style={styles.logTimeIn}>
                        {item.time_in || "—"}
                      </Text>
                    </View>
                    <View style={[styles.logTimeBadge, styles.logTimeBadgeOut]}>
                      <Ionicons
                        name="log-out-outline"
                        size={12}
                        color="#ef4444"
                      />
                      <Text style={styles.logTimeOut}>
                        {item.time_out || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* ── THIS MONTH (excluding today) ── */}
          {thisMonthGroups.length > 0 && (
            <>
              <View style={[styles.attSectionHeader, { marginTop: 16 }]}>
                <View style={styles.attSectionLeft}>
                  <Ionicons name="calendar-outline" size={14} color="#3b6ea5" />
                  <Text style={styles.attSectionTitle}>This Month</Text>
                  <Text style={styles.attSectionDate}>
                    {new Date().toLocaleDateString("en-PH", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View style={styles.attCountBadge}>
                  <Text style={styles.attCountText}>
                    {thisMonthGroups.length} days
                  </Text>
                </View>
              </View>

              {thisMonthGroups.map((group) => (
                <View key={group.date}>
                  <TouchableOpacity
                    style={styles.dayGroupHeader}
                    onPress={() => toggleThisMonthDay(group.date)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.dayGroupLeft}>
                      <Text style={styles.dayGroupNum}>
                        {parseInt(group.date.split("-")[2])}
                      </Text>
                      <View>
                        <Text style={styles.dayGroupDay}>
                          {new Date(
                            group.date + "T00:00:00",
                          ).toLocaleDateString("en-PH", { weekday: "long" })}
                        </Text>
                        <Text style={styles.dayGroupSub}>
                          {group.logs.length} log
                          {group.logs.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={group.expanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#bfdbfe"
                    />
                  </TouchableOpacity>

                  {group.expanded &&
                    group.logs.map((item: any) => (
                      <View
                        key={`${item.emp_no}_${item.id}`}
                        style={styles.logCard}
                      >
                        <View style={styles.logDateBadge}>
                          <Ionicons
                            name="person-outline"
                            size={12}
                            color="#3b6ea5"
                          />
                          <Text style={styles.logDateText}>{item.emp_no}</Text>
                          <TouchableOpacity
                            style={styles.logEditBtn}
                            onPress={() => openEditLog(item)}
                          >
                            <Ionicons
                              name="create-outline"
                              size={13}
                              color="#3b6ea5"
                            />
                            <Text style={styles.logEditBtnText}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.logBody}>
                          <View style={styles.logLeft}>
                            <Text style={styles.logName}>
                              {item.last_name}, {item.first_name}
                            </Text>
                            <Text style={styles.logEmpNo}>{item.emp_no}</Text>
                          </View>
                          <View style={styles.logRight}>
                            <View style={styles.logTimeBadge}>
                              <Ionicons
                                name="log-in-outline"
                                size={12}
                                color="#10b981"
                              />
                              <Text style={styles.logTimeIn}>
                                {item.time_in || "—"}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.logTimeBadge,
                                styles.logTimeBadgeOut,
                              ]}
                            >
                              <Ionicons
                                name="log-out-outline"
                                size={12}
                                color="#ef4444"
                              />
                              <Text style={styles.logTimeOut}>
                                {item.time_out || "—"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                </View>
              ))}
            </>
          )}

          {/* ── ARCHIVE BUTTON ── */}
          <TouchableOpacity
            style={styles.archiveOpenBtn}
            onPress={() => {
              setArchiveYears(getAttendanceYears());
              setArchiveView("years");
              setArchiveSelectedYear(null);
              setArchiveSelectedMonth(null);
              setArchiveDayGroups([]);
              setShowArchiveModal(true);
            }}
          >
            <Ionicons name="archive-outline" size={18} color="#d97706" />
            <Text style={styles.archiveOpenBtnText}>View Archives</Text>
            <Ionicons name="chevron-forward" size={14} color="#d97706" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.btnSync,
            syncStatus === "syncing" && styles.btnDisabled,
          ]}
          onPress={handleSync}
          disabled={syncStatus === "syncing"}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
          <Text style={styles.btnText}>{syncLabel()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnExport}
          onPress={() => setShowExportModal(true)}
        >
          <Ionicons name="document-outline" size={18} color="#1e3a5f" />
          <Text style={styles.btnExportText}>Export XLS</Text>
        </TouchableOpacity>
      </View>

      {/* ── Edit Warning Modal ── */}
      <Modal visible={!!warningLog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />

            {/* Warning Icon + Title */}
            <View style={styles.warnHeader}>
              <View style={styles.warnIconWrap}>
                <Ionicons name="warning-outline" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.warnTitle}>Edit Warning</Text>
            </View>

            <View style={styles.warnDivider} />

            {/* Message */}
            <Text style={styles.warnMessage}>
              You are about to edit the{" "}
              <Text style={styles.warnBold}>Time In</Text> and{" "}
              <Text style={styles.warnBold}>Time Out</Text> of:
            </Text>

            {warningLog && (
              <View style={styles.warnEmployeeBox}>
                <Ionicons name="person-outline" size={16} color="#3b6ea5" />
                <View>
                  <Text style={styles.warnEmployeeName}>
                    {warningLog.last_name}, {warningLog.first_name}
                  </Text>
                  <Text style={styles.warnEmployeeSub}>
                    {warningLog.emp_no} · {warningLog.date}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.warnNote}>
              This action will permanently overwrite the existing attendance
              record in both the local database and cloud. Only proceed if there
              was a <Text style={styles.warnBold}>clock error</Text> or{" "}
              <Text style={styles.warnBold}>missed entry</Text>. All changes are
              logged and cannot be automatically undone.
            </Text>

            <View style={styles.exportDivider} />

            {/* Actions */}
            <View style={styles.editLogActions}>
              <TouchableOpacity
                style={styles.editLogCancelBtn}
                onPress={() => setWarningLog(null)}
              >
                <Text style={styles.editLogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.warnProceedBtn}
                onPress={confirmEditLog}
              >
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={styles.editLogSaveText}>Proceed to Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Log Modal ── */}
      <Modal visible={!!editingLog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalHeaderIcon}>
                <Ionicons name="create-outline" size={20} color="#1e3a5f" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit Attendance</Text>
                {editingLog && (
                  <Text style={styles.modalSub}>
                    {editingLog.last_name}, {editingLog.first_name} ·{" "}
                    {editingLog.date}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setEditingLog(null)}
              >
                <Ionicons name="close" size={18} color="#1e3a5f" />
              </TouchableOpacity>
            </View>

            <View style={styles.exportDivider} />

            {/* Reason note */}
            <View style={styles.editLogNote}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#3b6ea5"
              />
              <Text style={styles.editLogNoteText}>
                Correct the time if the device clock was wrong or entry was
                missed.
              </Text>
            </View>

            {/* Time In */}
            <View style={styles.editLogSection}>
              <Text style={styles.editLogLabel}>
                <Ionicons name="log-in-outline" size={13} color="#10b981" />{" "}
                Time In
              </Text>
              <TouchableOpacity
                style={[styles.editLogTimeBtn, { borderColor: "#bbf7d0" }]}
                onPress={() => setShowEditTimeInPicker(true)}
              >
                <Ionicons name="time-outline" size={16} color="#10b981" />
                <Text
                  style={[
                    styles.editLogTimeText,
                    { color: editTimeIn ? "#1e3a5f" : "#93c5fd" },
                  ]}
                >
                  {editTimeIn || "Tap to set time in"}
                </Text>
                {editTimeIn ? (
                  <TouchableOpacity onPress={() => setEditTimeIn("")}>
                    <Ionicons name="close-circle" size={16} color="#93c5fd" />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            </View>

            {/* Time Out */}
            <View style={styles.editLogSection}>
              <Text style={styles.editLogLabel}>
                <Ionicons name="log-out-outline" size={13} color="#ef4444" />{" "}
                Time Out
              </Text>
              <TouchableOpacity
                style={[styles.editLogTimeBtn, { borderColor: "#fecdd3" }]}
                onPress={() => setShowEditTimeOutPicker(true)}
              >
                <Ionicons name="time-outline" size={16} color="#ef4444" />
                <Text
                  style={[
                    styles.editLogTimeText,
                    { color: editTimeOut ? "#1e3a5f" : "#93c5fd" },
                  ]}
                >
                  {editTimeOut || "Tap to set time out"}
                </Text>
                {editTimeOut ? (
                  <TouchableOpacity onPress={() => setEditTimeOut("")}>
                    <Ionicons name="close-circle" size={16} color="#93c5fd" />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            </View>

            <View style={styles.exportDivider} />

            {/* Action buttons */}
            <View style={styles.editLogActions}>
              <TouchableOpacity
                style={styles.editLogCancelBtn}
                onPress={() => setEditingLog(null)}
              >
                <Text style={styles.editLogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editLogSaveBtn,
                  isSavingLog && styles.btnDisabled,
                ]}
                onPress={handleSaveEditLog}
                disabled={isSavingLog}
              >
                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                <Text style={styles.editLogSaveText}>
                  {isSavingLog ? "Saving…" : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit log time pickers */}
      {showEditTimeInPicker && (
        <DateTimePicker
          value={parseTimeToDate(editTimeIn)}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event: any, selectedDate?: Date) => {
            setShowEditTimeInPicker(false);
            if (event.type === "set" && selectedDate) {
              setEditTimeIn(formatTimePicked(selectedDate));
            }
          }}
        />
      )}
      {showEditTimeOutPicker && (
        <DateTimePicker
          value={parseTimeToDate(editTimeOut)}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event: any, selectedDate?: Date) => {
            setShowEditTimeOutPicker(false);
            if (event.type === "set" && selectedDate) {
              setEditTimeOut(formatTimePicked(selectedDate));
            }
          }}
        />
      )}

      {/* ── Archive Modal ── */}
      <Modal visible={showArchiveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: "85%" }]}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.archiveModalHeader}>
              <View style={styles.archiveModalIconWrap}>
                <Ionicons name="archive-outline" size={20} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Archives</Text>
                <Text style={styles.modalSub}>Past attendance records</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowArchiveModal(false)}
              >
                <Ionicons name="close" size={18} color="#1e3a5f" />
              </TouchableOpacity>
            </View>

            <View style={styles.exportDivider} />

            {/* Breadcrumb */}
            {archiveView !== "years" && (
              <TouchableOpacity
                style={styles.archiveBreadcrumb}
                onPress={() => {
                  if (archiveView === "days") {
                    setArchiveView("months");
                    setArchiveSelectedMonth(null);
                    setArchiveDayGroups([]);
                  } else if (archiveView === "months") {
                    setArchiveView("years");
                    setArchiveSelectedYear(null);
                    setArchiveMonths([]);
                  }
                }}
              >
                <Ionicons name="chevron-back" size={14} color="#7c3aed" />
                <Text style={styles.archiveBreadcrumbText}>
                  {archiveView === "months"
                    ? "All Years"
                    : archiveSelectedYear && archiveSelectedMonth
                      ? `${archiveSelectedYear} › ${MONTH_NAMES[parseInt((archiveSelectedMonth ?? "0-0").split("-")[1]) - 1]}`
                      : "Back"}
                </Text>
              </TouchableOpacity>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ── YEAR LIST ── */}
              {archiveView === "years" &&
                (archiveYears.length === 0 ? (
                  <View style={styles.attEmptyBox}>
                    <Ionicons
                      name="archive-outline"
                      size={32}
                      color="#e9d5ff"
                    />
                    <Text style={styles.attEmptyText}>
                      No archived records yet
                    </Text>
                  </View>
                ) : (
                  archiveYears.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={styles.archiveDrillCard}
                      activeOpacity={0.75}
                      onPress={() => {
                        setArchiveSelectedYear(year);
                        setArchiveMonths(getAttendanceMonths(year));
                        setArchiveView("months");
                      }}
                    >
                      <View style={styles.archiveDrillIcon}>
                        <Ionicons
                          name="folder-outline"
                          size={20}
                          color="#7c3aed"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.archiveDrillTitle}>{year}</Text>
                        <Text style={styles.archiveDrillSub}>
                          <Text style={styles.archiveDrillSub}>
                            Tap to view months
                          </Text>
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#c4b5fd"
                      />
                    </TouchableOpacity>
                  ))
                ))}

              {/* ── MONTH LIST ── */}
              {archiveView === "months" &&
                (archiveMonths.length === 0 ? (
                  <View style={styles.attEmptyBox}>
                    <Text style={styles.attEmptyText}>No months found</Text>
                  </View>
                ) : (
                  archiveMonths.map((ym) => {
                    const [y, m] = ym.split("-");
                    const count = getLogCountByMonth(ym);
                    return (
                      <TouchableOpacity
                        key={ym}
                        style={styles.archiveDrillCard}
                        activeOpacity={0.75}
                        onPress={() => {
                          setArchiveSelectedMonth(ym);
                          setArchiveDayGroups(
                            getLogsGroupedByDay(ym).map((g) => ({
                              ...g,
                              expanded: false,
                            })),
                          );
                          setArchiveView("days");
                        }}
                      >
                        <View style={styles.archiveDrillIcon}>
                          <Ionicons
                            name="calendar-outline"
                            size={20}
                            color="#7c3aed"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.archiveDrillTitle}>
                            {MONTH_NAMES[parseInt(m) - 1]} {y}
                          </Text>
                          <Text style={styles.archiveDrillSub}>
                            {count} log{count !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#c4b5fd"
                        />
                      </TouchableOpacity>
                    );
                  })
                ))}

              {/* ── DAY LIST (collapsible) ── */}
              {archiveView === "days" &&
                (archiveDayGroups.length === 0 ? (
                  <View style={styles.attEmptyBox}>
                    <Text style={styles.attEmptyText}>No logs found</Text>
                  </View>
                ) : (
                  archiveDayGroups.map((group) => (
                    <View key={group.date} style={styles.archiveDayGroup}>
                      <TouchableOpacity
                        style={styles.archiveDayGroupHeader}
                        onPress={() =>
                          setArchiveDayGroups((prev) =>
                            prev.map((g) =>
                              g.date === group.date
                                ? { ...g, expanded: !g.expanded }
                                : g,
                            ),
                          )
                        }
                        activeOpacity={0.75}
                      >
                        <Text style={styles.archiveDayGroupNum}>
                          {parseInt(group.date.split("-")[2])}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.archiveDayGroupDay}>
                            {new Date(
                              group.date + "T00:00:00",
                            ).toLocaleDateString("en-PH", { weekday: "long" })}
                          </Text>
                          <Text style={styles.archiveDayGroupSub}>
                            {group.logs.length} log
                            {group.logs.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <Ionicons
                          name={group.expanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#c4b5fd"
                        />
                      </TouchableOpacity>

                      {group.expanded &&
                        group.logs.map((item: any) => (
                          <View
                            key={`${item.emp_no}_${item.id}`}
                            style={[
                              styles.logCard,
                              {
                                borderRadius: 0,
                                borderTopWidth: 0,
                                borderLeftWidth: 0,
                                borderRightWidth: 0,
                              },
                            ]}
                          >
                            <View style={styles.logDateBadge}>
                              <Ionicons
                                name="person-outline"
                                size={12}
                                color="#3b6ea5"
                              />
                              <Text style={styles.logDateText}>
                                {item.emp_no}
                              </Text>
                              <TouchableOpacity
                                style={styles.logEditBtn}
                                onPress={() => {
                                  setShowArchiveModal(false);
                                  openEditLog(item);
                                }}
                              >
                                <Ionicons
                                  name="create-outline"
                                  size={13}
                                  color="#3b6ea5"
                                />
                                <Text style={styles.logEditBtnText}>Edit</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.logBody}>
                              <View style={styles.logLeft}>
                                <Text style={styles.logName}>
                                  {item.last_name}, {item.first_name}
                                </Text>
                                <Text style={styles.logEmpNo}>
                                  {item.emp_no}
                                </Text>
                              </View>
                              <View style={styles.logRight}>
                                <View style={styles.logTimeBadge}>
                                  <Ionicons
                                    name="log-in-outline"
                                    size={12}
                                    color="#10b981"
                                  />
                                  <Text style={styles.logTimeIn}>
                                    {item.time_in || "—"}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.logTimeBadge,
                                    styles.logTimeBadgeOut,
                                  ]}
                                >
                                  <Ionicons
                                    name="log-out-outline"
                                    size={12}
                                    color="#ef4444"
                                  />
                                  <Text style={styles.logTimeOut}>
                                    {item.time_out || "—"}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))}
                    </View>
                  ))
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Quick Action Sheet (long press) ── */}
      <Modal visible={showQuickActions} transparent animationType="fade">
        <TouchableOpacity
          style={styles.qaOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickActions(false)}
        >
          <View style={styles.qaSheet}>
            <View style={styles.modalHandle} />

            {/* Employee mini info */}
            {longPressedEmployee && (
              <View style={styles.qaEmployeeRow}>
                <View style={styles.qaEmployeeIcon}>
                  <Ionicons name="person-outline" size={20} color="#3b6ea5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qaEmployeeName}>
                    {longPressedEmployee.last_name},{" "}
                    {longPressedEmployee.first_name}
                  </Text>
                  <Text style={styles.qaEmployeeSub}>
                    {longPressedEmployee.emp_no} ·{" "}
                    {longPressedEmployee.position || "No position"}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.exportDivider} />

            {/* Edit action */}
            <TouchableOpacity style={styles.qaAction} onPress={openQuickEdit}>
              <View
                style={[styles.qaActionIcon, { backgroundColor: "#eef3fa" }]}
              >
                <Ionicons name="create-outline" size={20} color="#1e3a5f" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.qaActionTitle}>Quick Edit</Text>
                <Text style={styles.qaActionSub}>
                  Edit employee details inline
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#bfdbfe" />
            </TouchableOpacity>

            {/* Archive action */}
            <TouchableOpacity
              style={styles.qaAction}
              onPress={handleQuickArchive}
            >
              <View
                style={[styles.qaActionIcon, { backgroundColor: "#fef3c7" }]}
              >
                <Ionicons name="archive-outline" size={20} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.qaActionTitle}>Archive Employee</Text>
                <Text style={styles.qaActionSub}>
                  Hide from active list, kept 6 months
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#bfdbfe" />
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.qaCancelBtn}
              onPress={() => setShowQuickActions(false)}
            >
              <Text style={styles.qaCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Quick Edit Warning Modal ── */}
      <WarningModal
        visible={showQuickEditWarning}
        title="Confirm Quick Edit"
        message="Heads up, you're about to edit this employee record. Make sure all changes are correct before saving."
        boldPhrases={["edit", "correct"]}
        accentColor="#d97706"
        okBgColor="#f59e0b"
        dontAskAgain={dontAskAgainQuickEdit}
        onToggleDontAsk={() => setDontAskAgainQuickEdit(!dontAskAgainQuickEdit)}
        onCancel={handleQuickEditWarningCancel}
        onOk={handleQuickEditWarningOk}
        okLabel="Proceed to Edit"
      />

      {/* ── Quick Edit Modal ── */}
      <Modal visible={showQuickEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: "90%" }]}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalHeaderIcon}>
                <Ionicons name="create-outline" size={20} color="#1e3a5f" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Quick Edit</Text>
                <Text style={styles.modalSub}>
                  {longPressedEmployee?.last_name},{" "}
                  {longPressedEmployee?.first_name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowQuickEdit(false)}
              >
                <Ionicons name="close" size={18} color="#1e3a5f" />
              </TouchableOpacity>
            </View>

            <View style={styles.exportDivider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: "Scan ID", value: qeScanId, set: setQeScanId },
                { label: "Last Name", value: qeLastName, set: setQeLastName },
                {
                  label: "First Name",
                  value: qeFirstName,
                  set: setQeFirstName,
                },
                {
                  label: "Middle Name",
                  value: qeMiddleName,
                  set: setQeMiddleName,
                },
                { label: "Suffix", value: qeSuffix, set: setQeSuffix },
                { label: "Position", value: qePosition, set: setQePosition },
                { label: "Sign On", value: qeSignOn, set: setQeSignOn },
                { label: "Sign Off", value: qeSignOff, set: setQeSignOff },
                {
                  label: "Contract Duration",
                  value: qeContractDuration,
                  set: setQeContractDuration,
                },
              ].map(({ label, value, set }) => (
                <View key={label} style={styles.qeField}>
                  <Text style={styles.qeLabel}>{label}</Text>
                  <TextInput
                    style={styles.qeInput}
                    value={value}
                    onChangeText={set}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    placeholderTextColor="#93c5fd"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.exportDivider} />

            <View style={styles.editLogActions}>
              <TouchableOpacity
                style={styles.editLogCancelBtn}
                onPress={() => setShowQuickEdit(false)}
              >
                <Text style={styles.editLogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editLogSaveBtn,
                  isSavingEmployee && styles.btnDisabled,
                ]}
                onPress={handleQuickSave}
                disabled={isSavingEmployee}
              >
                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                <Text style={styles.editLogSaveText}>
                  {isSavingEmployee ? "Saving…" : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Quick Archive Confirm Modal ── */}
      <ArchiveConfirmModal
        visible={showQuickArchiveConfirm}
        employee={longPressedEmployee}
        onCancel={() => {
          setShowQuickArchiveConfirm(false);
          setLongPressedEmployee(null);
        }}
        onConfirm={confirmQuickArchive}
      />

      {/* ── Export Options Modal ── */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalHeaderIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color="#1e3a5f"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Export to Excel</Text>
                <Text style={styles.modalSub}>
                  {employees.length} employees · {logs.length} attendance logs
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowExportModal(false)}
              >
                <Ionicons name="close" size={18} color="#1e3a5f" />
              </TouchableOpacity>
            </View>

            <View style={styles.exportDivider} />

            {/* Date Range Section */}
            <View style={styles.exportSection}>
              <View style={styles.exportSectionRow}>
                <Ionicons name="calendar-outline" size={13} color="#3b6ea5" />
                <Text style={styles.exportSectionLabel}>Date Range</Text>
                <Text style={styles.exportSectionHint}>
                  {" "}
                  · for Attendance only
                </Text>
              </View>
              <View style={styles.exportDateRow}>
                <TouchableOpacity
                  style={[
                    styles.exportDateBtn,
                    exportStartDate ? styles.exportDateBtnActive : null,
                  ]}
                  onPress={() => setShowExportStartPicker(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={exportStartDate ? "#1e3a5f" : "#93c5fd"}
                  />
                  <Text
                    style={[
                      styles.exportDateBtnText,
                      exportStartDate ? styles.exportDateBtnTextActive : null,
                    ]}
                  >
                    {exportStartDate
                      ? formatDateDisplay(exportStartDate)
                      : "From"}
                  </Text>
                  {exportStartDate ? (
                    <TouchableOpacity onPress={() => setExportStartDate("")}>
                      <Ionicons name="close-circle" size={14} color="#93c5fd" />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>

                <Ionicons name="arrow-forward" size={14} color="#bfdbfe" />

                <TouchableOpacity
                  style={[
                    styles.exportDateBtn,
                    exportEndDate ? styles.exportDateBtnActive : null,
                  ]}
                  onPress={() => setShowExportEndPicker(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={exportEndDate ? "#1e3a5f" : "#93c5fd"}
                  />
                  <Text
                    style={[
                      styles.exportDateBtnText,
                      exportEndDate ? styles.exportDateBtnTextActive : null,
                    ]}
                  >
                    {exportEndDate ? formatDateDisplay(exportEndDate) : "To"}
                  </Text>
                  {exportEndDate ? (
                    <TouchableOpacity onPress={() => setExportEndDate("")}>
                      <Ionicons name="close-circle" size={14} color="#93c5fd" />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              </View>

              {(exportStartDate || exportEndDate) && (
                <TouchableOpacity
                  onPress={() => {
                    setExportStartDate("");
                    setExportEndDate("");
                  }}
                  style={styles.clearDatesBtn}
                >
                  <Ionicons name="refresh-outline" size={12} color="#ef4444" />
                  <Text style={styles.clearDatesText}>Clear date range</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.exportDivider} />

            {/* Export Options */}
            <View style={styles.exportSection}>
              <View style={styles.exportSectionRow}>
                <Ionicons name="download-outline" size={13} color="#3b6ea5" />
                <Text style={styles.exportSectionLabel}>Choose Export</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.exportOptionBtn,
                  isExporting && styles.btnDisabled,
                ]}
                onPress={() => handleExport("employees")}
                disabled={isExporting}
              >
                <View
                  style={[
                    styles.exportOptionIcon,
                    { backgroundColor: "#eef3fa" },
                  ]}
                >
                  <Ionicons name="people-outline" size={20} color="#1e3a5f" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportOptionTitle}>Employees</Text>
                  <Text style={styles.exportOptionSub}>
                    {employees.length} record{employees.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View style={styles.exportChip}>
                  <Text style={styles.exportChipText}>.xlsx</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportOptionBtn,
                  isExporting && styles.btnDisabled,
                ]}
                onPress={() => handleExport("attendance")}
                disabled={isExporting}
              >
                <View
                  style={[
                    styles.exportOptionIcon,
                    { backgroundColor: "#e8f4ff" },
                  ]}
                >
                  <Ionicons name="time-outline" size={20} color="#3b6ea5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportOptionTitle}>Attendance</Text>
                  <Text style={styles.exportOptionSub}>
                    {exportStartDate || exportEndDate
                      ? "Filtered by date range"
                      : `${logs.length} log${logs.length !== 1 ? "s" : ""} · all dates`}
                  </Text>
                </View>
                <View style={styles.exportChip}>
                  <Text style={styles.exportChipText}>.xlsx</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportOptionBtn,
                  styles.exportBothBtn,
                  isExporting && styles.btnDisabled,
                ]}
                onPress={() => handleExport("both")}
                disabled={isExporting}
              >
                <View
                  style={[
                    styles.exportOptionIcon,
                    { backgroundColor: "#d1fae5" },
                  ]}
                >
                  <Ionicons
                    name="documents-outline"
                    size={20}
                    color="#0f6e56"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.exportOptionTitle, { color: "#0f6e56" }]}
                  >
                    Export Both
                  </Text>
                  <Text style={styles.exportOptionSub}>
                    Employees + Attendance in one file
                  </Text>
                </View>
                <View
                  style={[styles.exportChip, { backgroundColor: "#bbf7d0" }]}
                >
                  <Text style={[styles.exportChipText, { color: "#0f6e56" }]}>
                    .xlsx
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {isExporting && (
              <View style={styles.exportingRow}>
                <Ionicons name="sync-outline" size={14} color="#3b6ea5" />
                <Text style={styles.exportingText}>Generating your file…</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Export date pickers */}
      {showExportStartPicker && (
        <DateTimePicker
          value={exportStartDate ? new Date(exportStartDate) : new Date()}
          mode="date"
          display="calendar"
          onChange={(event: any, selectedDate?: Date) => {
            setShowExportStartPicker(false);
            if (event.type === "set" && selectedDate) {
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const d = String(selectedDate.getDate()).padStart(2, "0");
              setExportStartDate(`${y}-${m}-${d}`);
            }
          }}
        />
      )}
      {showExportEndPicker && (
        <DateTimePicker
          value={exportEndDate ? new Date(exportEndDate) : new Date()}
          mode="date"
          display="calendar"
          onChange={(event: any, selectedDate?: Date) => {
            setShowExportEndPicker(false);
            if (event.type === "set" && selectedDate) {
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const d = String(selectedDate.getDate()).padStart(2, "0");
              setExportEndDate(`${y}-${m}-${d}`);
            }
          }}
        />
      )}

      {/* ── Employee Detail Modal ── */}
      <Modal visible={!!selectedEmployee} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selectedEmployee && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name="person-outline" size={22} color="#3b6ea5" />
                  </View>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setSelectedEmployee(null)}
                  >
                    <Ionicons name="close" size={20} color="#1e3a5f" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalName}>
                  {selectedEmployee.last_name}, {selectedEmployee.first_name}{" "}
                  {selectedEmployee.middle_name ?? ""}{" "}
                  {selectedEmployee.suffix ?? ""}
                </Text>
                <Text style={styles.modalPosition}>
                  {selectedEmployee.position}
                </Text>
                <View style={styles.modalDivider} />
                {[
                  {
                    label: "Card No",
                    value: selectedEmployee.card_no,
                    icon: "scan-outline",
                  },
                  {
                    label: "Employee No",
                    value: selectedEmployee.emp_no,
                    icon: "id-card-outline",
                  },
                  {
                    label: "Sign On",
                    value: selectedEmployee.sign_on,
                    icon: "log-in-outline",
                  },
                  {
                    label: "Sign Off",
                    value: selectedEmployee.sign_off,
                    icon: "log-out-outline",
                  },
                  {
                    label: "Contract",
                    value: selectedEmployee.contract_duration,
                    icon: "time-outline",
                  },
                ].map((row) => (
                  <View key={row.label} style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                      <Ionicons
                        name={row.icon as any}
                        size={14}
                        color="#3b6ea5"
                      />
                      <Text style={styles.detailLabel}>{row.label}</Text>
                    </View>
                    <Text style={styles.detailValue}>{row.value || "—"}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Sync History Modal ── */}
      <Modal visible={showSyncHistory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.syncHistoryHeader}>
              <View>
                <Text style={styles.modalTitle}>Sync History</Text>
                <Text style={styles.modalSub}>Last 30 days</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSyncHistory(false)}>
                <Ionicons name="close" size={22} color="#1e3a5f" />
              </TouchableOpacity>
            </View>
            {syncHistory.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="cloud-outline" size={36} color="#bfdbfe" />
                <Text style={styles.modalEmptyText}>No sync history yet.</Text>
              </View>
            ) : (
              <FlatList
                data={syncHistory}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <Ionicons
                      name={
                        item.status === "success"
                          ? "checkmark-circle"
                          : "alert-circle"
                      }
                      size={20}
                      color={item.status === "success" ? "#10b981" : "#ef4444"}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>{item.synced_at}</Text>
                      <Text style={styles.historySummary}>
                        ↑ {item.pushed} pushed · ↓ {item.pulled} pulled
                        {item.errors > 0 ? ` · ⚠ ${item.errors} errors` : ""}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f0f7ff" },
  topBar: {
    backgroundColor: "#1e3a5f",
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: { flex: 1, alignItems: "center" },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  topBarSub: { fontSize: 11, color: "#93c5fd", marginTop: 2 },
  syncBar: {
    backgroundColor: "#eef5ff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  syncBarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  syncBarText: { fontSize: 12, fontWeight: "600" },
  syncBarSummary: { fontSize: 11, color: "#3b6ea5" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#1e3a5f" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#93c5fd" },
  tabTextActive: { color: "#1e3a5f" },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  filterDateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterDateText: { fontSize: 13, color: "#1e3a5f", flex: 1 },
  listContent: { padding: 16, gap: 10, paddingBottom: 100 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    overflow: "hidden",
  },
  cardAccent: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: "#3b6ea5",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eef3fa",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: "700", color: "#1e3a5f" },
  cardSub: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },
  cardMeta: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f7ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  metaText: { fontSize: 11, color: "#3b6ea5" },
  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    overflow: "hidden",
  },
  logDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0f7ff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  logDateText: { fontSize: 11, fontWeight: "600", color: "#3b6ea5" },
  logBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logLeft: { flex: 1 },
  logName: { fontSize: 14, fontWeight: "700", color: "#1e3a5f" },
  logEmpNo: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },
  logRight: { alignItems: "flex-end", gap: 5 },
  logTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  logTimeBadgeOut: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
  },
  logTimeIn: { fontSize: 13, fontWeight: "600", color: "#10b981" },
  logTimeOut: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f",
    marginTop: 8,
  },
  emptyHint: { fontSize: 13, color: "#93c5fd" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
  },
  btnSync: {
    backgroundColor: "#1e3a5f",
    padding: 14,
    borderRadius: 10,
    flex: 1.5,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnExport: {
    backgroundColor: "#f0f7ff",
    padding: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbeafe",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  btnExportText: { color: "#1e3a5f", fontWeight: "700", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eef3fa",
    alignItems: "center",
    justifyContent: "center",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalName: { fontSize: 18, fontWeight: "700", color: "#1e3a5f" },
  modalPosition: { fontSize: 13, color: "#3b6ea5", marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: "#dbeafe", marginVertical: 16 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f7ff",
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 13, color: "#3b6ea5" },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e3a5f",
    maxWidth: "55%",
    textAlign: "right",
  },
  syncHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e3a5f" },
  modalSub: { fontSize: 12, color: "#93c5fd", marginTop: 2 },
  modalEmpty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  modalEmptyText: { fontSize: 14, color: "#93c5fd" },
  historyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f7ff",
  },
  historyDate: { fontSize: 13, fontWeight: "600", color: "#1e3a5f" },
  historySummary: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },

  // ── Export Modal Styles ──────────────────────────────────────────────────
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#dbeafe",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  exportModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  exportModalHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#eef3fa",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  exportSection: { marginBottom: 4 },
  exportSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  exportSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3b6ea5",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  exportSectionHint: { fontSize: 11, color: "#93c5fd" },
  exportDateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exportDateArrow: { fontSize: 16, color: "#93c5fd", fontWeight: "700" },
  exportDateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  exportDateBtnActive: {
    backgroundColor: "#eef3fa",
    borderColor: "#93c5fd",
  },
  exportDateBtnText: { fontSize: 12, color: "#93c5fd", flex: 1 },
  exportDateBtnTextActive: { color: "#1e3a5f", fontWeight: "600" },
  clearDatesBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clearDatesText: { fontSize: 11, color: "#ef4444" },
  exportDivider: { height: 1, backgroundColor: "#f0f7ff", marginVertical: 14 },
  exportOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  exportBothBtn: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  exportOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  exportOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exportOptionTitle: { fontSize: 14, fontWeight: "700", color: "#1e3a5f" },
  exportOptionSub: {
    fontSize: 11,
    color: "#3b6ea5",
    marginTop: 2,
    flexShrink: 1,
  },
  exportChip: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exportChipText: { fontSize: 11, fontWeight: "700", color: "#3b6ea5" },
  exportingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 4,
    paddingBottom: 4,
  },
  exportingText: {
    textAlign: "center",
    fontSize: 12,
    color: "#3b6ea5",
    fontStyle: "italic",
  },

  // ── Log card edit button ────────────────────────────────────────────────
  logEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto",
    backgroundColor: "#eef3fa",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  logEditBtnText: { fontSize: 11, color: "#3b6ea5", fontWeight: "600" },

  // ── Edit Log Modal ──────────────────────────────────────────────────────
  editLogNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#f0f7ff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  editLogNoteText: { fontSize: 12, color: "#3b6ea5", flex: 1, lineHeight: 17 },
  editLogSection: { marginBottom: 12 },
  editLogLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1e3a5f",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  editLogTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editLogTimeText: { fontSize: 15, fontWeight: "600", flex: 1 },
  editLogActions: {
    flexDirection: "row",
    gap: 10,
  },
  editLogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
  },
  editLogCancelText: { fontSize: 14, color: "#3b6ea5", fontWeight: "600" },
  editLogSaveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1e3a5f",
  },
  editLogSaveText: { fontSize: 14, color: "#fff", fontWeight: "700" },

  // ── Warning Modal ───────────────────────────────────────────────────────
  warnHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  warnIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  warnTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#92400e",
    letterSpacing: 0.3,
  },
  warnDivider: {
    height: 1,
    backgroundColor: "#fde68a",
    marginBottom: 14,
  },
  warnMessage: {
    fontSize: 13,
    color: "#1e3a5f",
    lineHeight: 20,
    marginBottom: 12,
  },
  warnBold: { fontWeight: "700", color: "#1e3a5f" },
  warnEmployeeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0f7ff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    marginBottom: 12,
  },
  warnEmployeeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  warnEmployeeSub: {
    fontSize: 11,
    color: "#3b6ea5",
    marginTop: 2,
  },
  warnNote: {
    fontSize: 12,
    color: "#78716c",
    lineHeight: 18,
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 4,
  },
  warnProceedBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f59e0b",
  },

  // ── Attendance Tab — Today + This Month ─────────────────────────────────
  attSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  attSectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  attTodayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
  },
  attSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e3a5f",
  },
  attSectionDate: {
    fontSize: 11,
    color: "#3b6ea5",
    flex: 1,
  },
  attCountBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  attCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  attEmptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    backgroundColor: "#f8fbff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderStyle: "dashed",
    marginBottom: 8,
  },
  attEmptyText: {
    fontSize: 13,
    color: "#93c5fd",
    fontStyle: "italic",
  },

  // ── Day group rows (collapsible, this month) ────────────────────────────
  dayGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eef3fa",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  dayGroupLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayGroupNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e3a5f",
    width: 32,
    textAlign: "center",
  },
  dayGroupDay: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  dayGroupSub: {
    fontSize: 11,
    color: "#3b6ea5",
    marginTop: 1,
  },

  // ── Archive open button ─────────────────────────────────────────────────
  archiveOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  archiveOpenBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
  },

  // ── Archive modal ───────────────────────────────────────────────────────
  archiveModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  archiveModalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#f5f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  archiveBreadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f5f0ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  archiveBreadcrumbText: {
    fontSize: 12,
    color: "#7c3aed",
    fontWeight: "600",
    flex: 1,
  },
  archiveDrillCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    marginBottom: 8,
  },
  archiveDrillIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  archiveDrillTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4c1d95",
  },
  archiveDrillSub: {
    fontSize: 11,
    color: "#7c3aed",
    marginTop: 2,
  },
  archiveDayGroup: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    overflow: "hidden",
    marginBottom: 8,
  },
  archiveDayGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ede9fe",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  archiveDayGroupNum: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4c1d95",
    width: 28,
    textAlign: "center",
  },
  archiveDayGroupDay: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4c1d95",
  },
  archiveDayGroupSub: {
    fontSize: 11,
    color: "#7c3aed",
    marginTop: 1,
  },

  // ── Quick Action Sheet ──────────────────────────────────────────────────
  qaOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  qaSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  qaEmployeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  qaEmployeeIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#eef3fa",
    alignItems: "center",
    justifyContent: "center",
  },
  qaEmployeeName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  qaEmployeeSub: {
    fontSize: 12,
    color: "#3b6ea5",
    marginTop: 2,
  },
  qaAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  qaActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qaActionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  qaActionSub: {
    fontSize: 11,
    color: "#3b6ea5",
    marginTop: 2,
  },
  qaCancelBtn: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  qaCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3b6ea5",
  },

  // ── Quick Edit form fields ──────────────────────────────────────────────
  qeField: { marginBottom: 12 },
  qeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3b6ea5",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  qeInput: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e3a5f",
    backgroundColor: "#f8fbff",
  },
});
