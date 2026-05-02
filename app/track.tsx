// app/track.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addAttendanceLog,
  getAttendanceLogByCardAndDate,
  getEmployeeByCardNo,
  updateTimeOut,
} from "../database/db";

export default function TrackScreen() {
  const router = useRouter();
  const [manualId, setManualId] = useState("");
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [notRegisteredModal, setNotRegisteredModal] = useState(false);
  const [scannedUnknownId, setScannedUnknownId] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [liveMatch, setLiveMatch] = useState<any>(null);

  const getToday = () => new Date().toISOString().split("T")[0];
  const getTime = () => new Date().toTimeString().split(" ")[0];

  const handleManualIdChange = (text: string) => {
    setManualId(text);
    if (text.trim().length === 0) {
      setLiveMatch(null);
      return;
    }
    const found = getEmployeeByCardNo(text.trim()) as any;
    setLiveMatch(found ?? null);
  };

  const handleManualSearch = () => {
    if (!manualId.trim()) {
      Alert.alert("Error", "Please enter a card number.");
      return;
    }
    if (liveMatch) {
      setEmployee(liveMatch);
      setLiveMatch(null);
    } else {
      setScannedUnknownId(manualId.trim());
      setNotRegisteredModal(true);
    }
  };

  const handleScanInput = (text: string) => {
    setScanInput(text);
    if (text.endsWith("\n") || text.endsWith("\r")) {
      const cardNo = text.replace(/[\r\n]/g, "").trim();
      const found = getEmployeeByCardNo(cardNo) as any;
      if (found) {
        setEmployee(found);
        setScanModalVisible(false);
        setScanInput("");
      } else {
        setScannedUnknownId(cardNo);
        setNotRegisteredModal(true);
        setScanInput("");
      }
      return;
    }
    if (text.length >= 10) {
      const found = getEmployeeByCardNo(text.trim()) as any;
      if (found) {
        setEmployee(found);
        setScanModalVisible(false);
        setScanInput("");
      }
    }
  };

  const handleTimeIn = () => {
    if (!employee) {
      Alert.alert("Error", "No employee selected.");
      return;
    }
    try {
      // Check if already timed in today
      const today = getToday();
      const existingLog = getAttendanceLogByCardAndDate(
        employee.card_no,
        today,
      ) as any;

      if (existingLog) {
        Alert.alert(
          "Already Timed In",
          `${employee.last_name}, ${employee.first_name} already timed in today at ${existingLog.time_in}.`,
        );
        return;
      }

      const recordedTime = getTime();
      addAttendanceLog(
        employee.card_no,
        employee.emp_no,
        employee.last_name,
        employee.first_name,
        getToday(),
        recordedTime,
      );
      Alert.alert(
        "Time In Recorded",
        `${employee.last_name}, ${employee.first_name}\n${recordedTime}`,
      );
      setEmployee(null);
      setManualId("");
      setLiveMatch(null);
    } catch {
      Alert.alert("Error", "Already timed in today or failed to record.");
    }
  };

  const handleTimeOut = () => {
    if (!employee) {
      Alert.alert("Error", "No employee selected.");
      return;
    }
    try {
      // Check if there's a Time In record first
      const today = getToday();
      const existingLog = getAttendanceLogByCardAndDate(
        employee.card_no,
        today,
      ) as any;

      if (!existingLog) {
        Alert.alert(
          "No Time In Record",
          `${employee.last_name}, ${employee.first_name} has no Time In record for today.`,
        );
        return;
      }
      if (existingLog.time_out) {
        Alert.alert(
          "Already Timed Out",
          `${employee.last_name}, ${employee.first_name} already timed out today at ${existingLog.time_out}.`,
        );
        return;
      }
      const recordedTime = getTime();
      updateTimeOut(employee.card_no, getToday(), recordedTime);
      Alert.alert(
        "Time Out Recorded",
        `${employee.last_name}, ${employee.first_name}\n${recordedTime}`,
      );
      setEmployee(null);
      setManualId("");
      setLiveMatch(null);
    } catch {
      Alert.alert("Error", "Failed to record time out.");
    }
  };

  const displayEmployee = employee ?? liveMatch;
  const isLivePreview = !employee && !!liveMatch;

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Track Attendance</Text>
          <Text style={styles.topBarSub}>
            {new Date().toLocaleDateString("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.backBtnSpacer} />
      </View>

      <View style={styles.container}>
        {/* ── Employee Card ── */}
        <View
          style={[styles.nameCard, isLivePreview && styles.nameCardPreview]}
        >
          {displayEmployee ? (
            <>
              {isLivePreview && (
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>
                    PREVIEW — Press Search to confirm
                  </Text>
                </View>
              )}
              <View style={styles.nameCardInner}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {displayEmployee.first_name?.[0]}
                    {displayEmployee.last_name?.[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.employeeNo}>
                    {displayEmployee.emp_no}
                  </Text>
                  <Text style={styles.employeeName}>
                    {displayEmployee.last_name}, {displayEmployee.first_name}
                  </Text>
                  <Text style={styles.employeePosition}>
                    {displayEmployee.position}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noEmployeeWrap}>
              <View style={styles.noEmployeeIcon}>
                <Ionicons name="person-outline" size={32} color="#93c5fd" />
              </View>
              <Text style={styles.noEmployeeTitle}>No Employee Selected</Text>
              <Text style={styles.noEmployeeHint}>
                Search or scan a card below
              </Text>
            </View>
          )}
        </View>

        {/* ── Manual Entry ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="keypad-outline" size={14} color="#3b6ea5" />
            <Text style={styles.cardTitle}>Manual Entry</Text>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={manualId}
              onChangeText={handleManualIdChange}
              placeholder="Type card number..."
              placeholderTextColor="#93c5fd"
              onSubmitEditing={handleManualSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.btnSearch}
              onPress={handleManualSearch}
            >
              <Ionicons name="search-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scan Button ── */}
        <TouchableOpacity
          style={styles.btnScan}
          onPress={() => {
            setScanInput("");
            setScanModalVisible(true);
          }}
        >
          <Ionicons name="scan-outline" size={20} color="#ffffff" />
          <Text style={styles.btnScanText}>Scan RFID Card</Text>
        </TouchableOpacity>

        {/* ── Time In / Out ── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btnTimeIn, !employee && styles.btnDisabled]}
            onPress={handleTimeIn}
            disabled={!employee}
          >
            <Ionicons name="log-in-outline" size={22} color="#ffffff" />
            <Text style={styles.btnText}>Time In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnTimeOut, !employee && styles.btnTimeOutDisabled]}
            onPress={handleTimeOut}
            disabled={!employee}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={employee ? "#1e3a5f" : "#93c5fd"}
            />
            <Text
              style={[styles.btnTimeOutText, !employee && { color: "#93c5fd" }]}
            >
              Time Out
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={notRegisteredModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.notRegBox}>
            <View style={styles.notRegIconCircle}>
              <Ionicons name="help-circle-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.notRegTitle}>Card Not Registered</Text>
            <Text style={styles.notRegText}>The scanned card ID:</Text>
            <View style={styles.notRegIdBox}>
              <Text style={styles.notRegId}>{scannedUnknownId}</Text>
            </View>
            <Text style={styles.notRegText}>
              is not yet registered to any employee.{"\n"}
              Please register it first in Add Entry.
            </Text>
            <View style={styles.notRegDivider} />
            <TouchableOpacity
              style={styles.notRegBtn}
              onPress={() => {
                setNotRegisteredModal(false);
                setScannedUnknownId("");
                setScanModalVisible(false);
              }}
            >
              <Ionicons name="close-outline" size={16} color="#ffffff" />
              <Text style={styles.notRegBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Scan Modal ── */}
      <Modal visible={scanModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="scan-outline" size={32} color="#1e3a5f" />
            </View>
            <Text style={styles.modalTitle}>Scan RFID Card</Text>
            <Text style={styles.modalSub}>Tap your card on the scanner</Text>
            <TextInput
              style={styles.scanInput}
              value={scanInput}
              onChangeText={handleScanInput}
              placeholder="Waiting for scan..."
              placeholderTextColor="#93c5fd"
              autoFocus
              showSoftInputOnFocus={false}
            />
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setScanModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
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
  topBarSub: { fontSize: 11, color: "#93c5fd", marginTop: 2 },

  container: { flex: 1, padding: 16, gap: 12 },

  // ── Employee Name Card ──
  nameCard: {
    backgroundColor: "#1e3a5f",
    borderRadius: 14,
    padding: 20,
    minHeight: 120,
    justifyContent: "center",
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nameCardPreview: {
    backgroundColor: "#2d5a8e",
    borderWidth: 2,
    borderColor: "#93c5fd",
    borderStyle: "dashed",
  },
  nameCardInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 18, fontWeight: "700", color: "#ffffff" },

  previewBadge: {
    backgroundColor: "rgba(147,197,253,0.2)",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#93c5fd",
    letterSpacing: 0.8,
  },

  employeeNo: {
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: "600",
    marginBottom: 2,
  },
  employeeName: { fontSize: 20, color: "#ffffff", fontWeight: "700" },
  employeePosition: { fontSize: 12, color: "#93c5fd", marginTop: 3 },

  noEmployeeWrap: { alignItems: "center", gap: 6 },
  noEmployeeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  noEmployeeTitle: { fontSize: 15, color: "#ffffff", fontWeight: "600" },
  noEmployeeHint: { fontSize: 12, color: "#93c5fd" },

  // ── Input Card ──
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dbeafe",
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3b6ea5",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  input: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: "#1e3a5f",
    backgroundColor: "#f8fbff",
  },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  btnSearch: {
    backgroundColor: "#1e3a5f",
    padding: 11,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: 44,
  },

  btnScan: {
    backgroundColor: "#2d5a8e",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnScanText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },

  buttonRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  btnTimeIn: {
    backgroundColor: "#1e3a5f",
    padding: 18,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  btnTimeOut: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1e3a5f",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnTimeOutDisabled: {
    borderColor: "#dbeafe",
    backgroundColor: "#f8fbff",
  },
  btnDisabled: { backgroundColor: "#94a3b8", shadowOpacity: 0, elevation: 0 },
  btnText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  btnTimeOutText: { color: "#1e3a5f", fontWeight: "700", fontSize: 16 },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    width: "82%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0f7ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: "#3b6ea5",
    marginBottom: 20,
    textAlign: "center",
  },
  scanInput: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1e3a5f",
    backgroundColor: "#f8fbff",
    width: "100%",
    marginBottom: 14,
    textAlign: "center",
  },
  modalCancel: {
    padding: 13,
    backgroundColor: "#fff5f5",
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  modalCancelText: { color: "#c0392b", fontWeight: "700", fontSize: 14 },

  notRegBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "82%",
    alignItems: "center",
    elevation: 10,
  },
  notRegIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  notRegTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 10,
  },
  notRegText: {
    fontSize: 13,
    color: "#334155",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  notRegIdBox: {
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  notRegId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e3a5f",
    letterSpacing: 1,
  },
  notRegDivider: {
    height: 1,
    backgroundColor: "#dbeafe",
    width: "100%",
    marginVertical: 16,
  },
  notRegBtn: {
    backgroundColor: "#1e3a5f",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notRegBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
