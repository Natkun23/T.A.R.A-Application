// app/archived.tsx
import {
  deleteEmployee,
  getArchivedEmployees,
  restoreEmployee,
} from "@/database/db";
import { syncDeleteEmployee } from "@/database/sync";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ── Helper: how many days since archived ────────────────────────────────────
function daysSince(isoDate: string): number {
  const archived = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - archived) / (1000 * 60 * 60 * 24));
}

function daysRemaining(isoDate: string, totalMonths = 6): number {
  const archived = new Date(isoDate);
  const purgeDate = new Date(archived);
  purgeDate.setMonth(purgeDate.getMonth() + totalMonths);
  return Math.max(
    0,
    Math.floor((purgeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Urgency color for days remaining ────────────────────────────────────────
function urgencyColor(days: number) {
  if (days <= 30) return { bg: "#fff1f2", border: "#fecaca", text: "#dc2626" };
  if (days <= 90) return { bg: "#fffbeb", border: "#fde68a", text: "#d97706" };
  return { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" };
}

export default function ArchivedScreen() {
  const router = useRouter();
  const isOnline = useNetworkStatus();

  const [archived, setArchived] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Selected employee for modals
  const [selected, setSelected] = useState<any>(null);

  // Modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");

  // ── Load archived employees ────────────────────────────────────────────────
  const loadArchived = () => {
    const rows = getArchivedEmployees() as any[];
    setArchived(rows);
    setFiltered(rows);
    setSearch("");
  };

  useEffect(() => {
    loadArchived();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadArchived();
    setRefreshing(false);
  };

  // ── Search filter ──────────────────────────────────────────────────────────
  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(archived);
      return;
    }
    const q = text.toLowerCase();
    setFiltered(
      archived.filter(
        (e) =>
          e.emp_no.toLowerCase().includes(q) ||
          e.last_name.toLowerCase().includes(q) ||
          e.first_name.toLowerCase().includes(q) ||
          (e.position ?? "").toLowerCase().includes(q),
      ),
    );
  };

  // ── Open action modal ──────────────────────────────────────────────────────
  const handleSelectEmployee = (emp: any) => {
    setSelected(emp);
    setDeleteTyped("");
    setShowActionModal(true);
  };

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleRestore = () => {
    if (!selected) return;
    try {
      restoreEmployee(selected.emp_no);
      setShowRestoreConfirm(false);
      setShowActionModal(false);
      loadArchived();
      Alert.alert(
        "Employee Restored!",
        `${selected.last_name}, ${selected.first_name} is now active again and can log attendance.`,
        [{ text: "Great!" }],
      );
    } catch {
      Alert.alert("Error", "Failed to restore employee. Please try again.");
    }
  };

  // ── Permanent Delete ───────────────────────────────────────────────────────
  const handlePermanentDelete = async () => {
    if (!selected) return;
    try {
      deleteEmployee(selected.emp_no);
      if (isOnline) {
        try {
          await syncDeleteEmployee(selected.emp_no);
        } catch {}
      }
      setShowDeleteConfirm(false);
      setShowActionModal(false);
      setDeleteTyped("");
      loadArchived();
      Alert.alert(
        "Permanently Deleted",
        `${selected.last_name}, ${selected.first_name} has been permanently removed from the system.`,
        [{ text: "OK" }],
      );
    } catch {
      Alert.alert("Error", "Failed to delete employee. Please try again.");
    }
  };

  const deleteConfirmMatch =
    deleteTyped.trim().toUpperCase() ===
    `${selected?.last_name?.toUpperCase()} ${selected?.first_name?.toUpperCase()}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Archived Employees</Text>
          <Text style={styles.topBarSub}>
            {archived.length === 0
              ? "No archived employees"
              : `${archived.length} employee${archived.length > 1 ? "s" : ""} archived`}
          </Text>
        </View>
        <View style={styles.backBtnSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#3b6ea5" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Search archived employees..."
          placeholderTextColor="#93c5fd"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={18} color="#93c5fd" />
          </TouchableOpacity>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#dc2626" }]} />
          <Text style={styles.legendText}>Expiring soon (≤30 days)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#d97706" }]} />
          <Text style={styles.legendText}>≤90 days</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#16a34a" }]} />
          <Text style={styles.legendText}>Safe</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="archive-outline" size={64} color="#bfdbfe" />
            <Text style={styles.emptyTitle}>
              {archived.length === 0
                ? "No Archived Employees"
                : "No Results Found"}
            </Text>
            <Text style={styles.emptySub}>
              {archived.length === 0
                ? "Archived employees will appear here.\nThey are kept for 6 months."
                : "Try a different search term."}
            </Text>
          </View>
        ) : (
          filtered.map((emp) => {
            const days = daysRemaining(emp.archived_at);
            const urg = urgencyColor(days);
            return (
              <TouchableOpacity
                key={emp.emp_no}
                style={styles.empCard}
                onPress={() => handleSelectEmployee(emp)}
                activeOpacity={0.75}
              >
                {/* Avatar */}
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: urg.bg, borderColor: urg.border },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: urg.text }]}>
                    {emp.first_name?.[0]}
                    {emp.last_name?.[0]}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>
                    {emp.last_name}, {emp.first_name}
                    {emp.suffix ? ` ${emp.suffix}` : ""}
                  </Text>
                  <Text style={styles.empSub}>
                    {emp.emp_no} · {emp.position}
                  </Text>
                  <Text style={styles.empArchiveDate}>
                    Archived {formatDate(emp.archived_at)} ·{" "}
                    {daysSince(emp.archived_at)}d ago
                  </Text>
                </View>

                {/* Days Remaining Badge */}
                <View
                  style={[
                    styles.daysBadge,
                    { backgroundColor: urg.bg, borderColor: urg.border },
                  ]}
                >
                  <Text style={[styles.daysBadgeNum, { color: urg.text }]}>
                    {days}
                  </Text>
                  <Text style={[styles.daysBadgeLabel, { color: urg.text }]}>
                    days{"\n"}left
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#93c5fd"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── Action Modal (Restore or Delete) ──────────────────────────────── */}
      <Modal visible={showActionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheet}>
            {/* Employee Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetAvatar}>
                <Text style={styles.sheetAvatarText}>
                  {selected?.first_name?.[0]}
                  {selected?.last_name?.[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetName}>
                  {selected?.last_name}, {selected?.first_name}
                  {selected?.suffix ? ` ${selected.suffix}` : ""}
                </Text>
                <Text style={styles.sheetSub}>
                  {selected?.emp_no} · {selected?.position}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowActionModal(false)}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={20} color="#3b6ea5" />
              </TouchableOpacity>
            </View>

            {/* Archive Info */}
            {selected?.archived_at && (
              <View style={styles.archiveInfoRow}>
                <Ionicons name="time-outline" size={14} color="#3b6ea5" />
                <Text style={styles.archiveInfoText}>
                  Archived on {formatDate(selected.archived_at)} ·{" "}
                  <Text
                    style={{
                      fontWeight: "700",
                      color: urgencyColor(daysRemaining(selected.archived_at))
                        .text,
                    }}
                  >
                    {daysRemaining(selected.archived_at)} days remaining
                  </Text>{" "}
                  before auto-purge
                </Text>
              </View>
            )}

            <View style={styles.sheetDivider} />

            {/* Restore Button */}
            <TouchableOpacity
              style={styles.btnRestore}
              onPress={() => {
                setShowActionModal(false);
                setTimeout(() => setShowRestoreConfirm(true), 300);
              }}
            >
              <View style={styles.btnRestoreIcon}>
                <Ionicons
                  name="refresh-circle-outline"
                  size={26}
                  color="#16a34a"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.btnRestoreTitle}>Restore Employee</Text>
                <Text style={styles.btnRestoreSub}>
                  Restore an employee record.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#16a34a" />
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            {/* Permanent Delete Button */}
            <TouchableOpacity
              style={styles.btnPermDelete}
              onPress={() => {
                setShowActionModal(false);
                setDeleteTyped("");
                setTimeout(() => setShowDeleteConfirm(true), 300);
              }}
            >
              <View style={styles.btnPermDeleteIcon}>
                <Ionicons name="trash-outline" size={26} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.btnPermDeleteTitle}>
                  Permanently Delete
                </Text>
                <Text style={styles.btnPermDeleteSub}>
                  This action is permanent and cannot be undone.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#dc2626" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Restore Confirm Modal ──────────────────────────────────────────── */}
      <Modal visible={showRestoreConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View
              style={[styles.confirmIconCircle, { backgroundColor: "#f0fdf4" }]}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={36}
                color="#16a34a"
              />
            </View>
            <Text style={[styles.confirmTitle, { color: "#16a34a" }]}>
              Restore Employee?
            </Text>
            <Text style={styles.confirmText}>
              This will move the employee back to active status:
            </Text>
            <View
              style={[
                styles.highlightBox,
                { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
              ]}
            >
              <Text style={[styles.highlightId, { color: "#16a34a" }]}>
                {selected?.emp_no}
              </Text>
              <Text style={styles.highlightName}>
                {selected?.last_name}, {selected?.first_name}
              </Text>
              <Text style={styles.highlightSub}>{selected?.position}</Text>
            </View>
            <Text style={styles.confirmNote}>
              They will appear in the active employee list and can log
              attendance again.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.btnConfirmCancel}
                onPress={() => setShowRestoreConfirm(false)}
              >
                <Text style={styles.btnConfirmCancelText}>No, Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnConfirmAction,
                  { backgroundColor: "#16a34a" },
                ]}
                onPress={handleRestore}
              >
                <Ionicons
                  name="refresh-circle-outline"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.btnConfirmActionText}>Yes, Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Permanent Delete Confirm Modal ─────────────────────────────────── */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View
              style={[styles.confirmIconCircle, { backgroundColor: "#fff1f2" }]}
            >
              <Ionicons name="close-circle-outline" size={36} color="#dc2626" />
            </View>
            <Text style={[styles.confirmTitle, { color: "#dc2626" }]}>
              Permanently Delete?
            </Text>
            <Text style={styles.confirmText}>
              This action{" "}
              <Text style={{ fontWeight: "700", color: "#dc2626" }}>
                CANNOT be undone.
              </Text>{" "}
              All data for this employee will be erased forever.
            </Text>
            <View
              style={[
                styles.highlightBox,
                { borderColor: "#fecaca", backgroundColor: "#fff1f2" },
              ]}
            >
              <Text style={[styles.highlightId, { color: "#dc2626" }]}>
                {selected?.emp_no}
              </Text>
              <Text style={styles.highlightName}>
                {selected?.last_name}, {selected?.first_name}
              </Text>
              <Text style={styles.highlightSub}>{selected?.position}</Text>
            </View>

            {/* Type-to-confirm */}
            <View style={styles.typeConfirmWrap}>
              <Text style={styles.typeConfirmLabel}>
                Type{" "}
                <Text style={{ fontWeight: "700", color: "#dc2626" }}>
                  {selected?.last_name?.toUpperCase()}{" "}
                  {selected?.first_name?.toUpperCase()}
                </Text>{" "}
                to confirm:
              </Text>
              <TextInput
                style={[
                  styles.typeConfirmInput,
                  deleteConfirmMatch && {
                    borderColor: "#dc2626",
                    backgroundColor: "#fff1f2",
                  },
                ]}
                value={deleteTyped}
                onChangeText={setDeleteTyped}
                placeholder="Type full name here..."
                placeholderTextColor="#fca5a5"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.btnConfirmCancel}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTyped("");
                }}
              >
                <Text style={styles.btnConfirmCancelText}>No, Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnConfirmAction,
                  {
                    backgroundColor: deleteConfirmMatch ? "#dc2626" : "#fca5a5",
                  },
                ]}
                onPress={handlePermanentDelete}
                disabled={!deleteConfirmMatch}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.btnConfirmActionText}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 16,
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
    marginBottom: 2,
  },
  backBtnSpacer: { width: 36 },
  topBarCenter: { flex: 1, alignItems: "center" },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  topBarSub: {
    fontSize: 11,
    color: "#93c5fd",
    marginTop: 2,
    textAlign: "center",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    elevation: 2,
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1e3a5f" },

  legendRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#3b6ea5" },

  listContainer: { padding: 16, paddingBottom: 40, gap: 10 },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#3b6ea5" },
  emptySub: {
    fontSize: 13,
    color: "#93c5fd",
    textAlign: "center",
    lineHeight: 20,
  },

  empCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    elevation: 2,
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: "700", color: "#1e3a5f" },
  empSub: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },
  empArchiveDate: { fontSize: 11, color: "#93c5fd", marginTop: 3 },
  daysBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 48,
  },
  daysBadgeNum: { fontSize: 16, fontWeight: "800" },
  daysBadgeLabel: { fontSize: 9, fontWeight: "600", textAlign: "center" },

  // ── Modals ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sheetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAvatarText: { fontSize: 16, fontWeight: "700", color: "#1e3a5f" },
  sheetName: { fontSize: 16, fontWeight: "700", color: "#1e3a5f" },
  sheetSub: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  archiveInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  archiveInfoText: { fontSize: 12, color: "#3b6ea5", flex: 1, lineHeight: 18 },
  sheetDivider: { height: 1, backgroundColor: "#f0f7ff", marginVertical: 12 },

  btnRestore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 4,
  },
  btnRestoreIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRestoreTitle: { fontSize: 15, fontWeight: "700", color: "#16a34a" },
  btnRestoreSub: { fontSize: 12, color: "#4ade80", marginTop: 2 },

  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
  },
  orLine: { flex: 1, height: 1, backgroundColor: "#dbeafe" },
  orText: { fontSize: 12, color: "#93c5fd", fontWeight: "600" },

  btnPermDelete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff1f2",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 4,
  },
  btnPermDeleteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPermDeleteTitle: { fontSize: 15, fontWeight: "700", color: "#dc2626" },
  btnPermDeleteSub: { fontSize: 12, color: "#f87171", marginTop: 2 },

  sheetCancelBtn: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  sheetCancelText: { fontSize: 15, fontWeight: "700", color: "#1e3a5f" },

  // ── Confirm Modals ───────────────────────────────────────────────────────
  confirmBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    margin: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  confirmIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  confirmText: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  highlightBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  highlightId: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 1,
  },
  highlightName: {
    fontSize: 18,
    color: "#1e3a5f",
    fontWeight: "700",
    textAlign: "center",
  },
  highlightSub: { fontSize: 12, color: "#3b6ea5", marginTop: 4 },
  confirmNote: {
    fontSize: 12,
    color: "#3b6ea5",
    marginBottom: 20,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 18,
  },
  confirmButtons: { flexDirection: "row", gap: 10, width: "100%" },
  btnConfirmCancel: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  btnConfirmCancelText: { color: "#1e3a5f", fontWeight: "700" },
  btnConfirmAction: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnConfirmActionText: { color: "#ffffff", fontWeight: "700" },

  // ── Type-to-confirm ──────────────────────────────────────────────────────
  typeConfirmWrap: { width: "100%", marginBottom: 16 },
  typeConfirmLabel: {
    fontSize: 13,
    color: "#334155",
    marginBottom: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  typeConfirmInput: {
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fff8f8",
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 1,
  },
});
