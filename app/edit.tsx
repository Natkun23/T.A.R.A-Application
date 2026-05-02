// app/edit.tsx
import NotRegisteredModal from "@/components/modals/NotRegisteredModal";
import ScanModal from "@/components/modals/ScanModal";
import WarningModal from "@/components/modals/WarningModal";
import { getAllEmployees, updateEmployee } from "@/database/db";
import { syncSingleEmployee } from "@/database/sync";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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

const POSITIONS = [
  "Stateroom Steward",
  "Jr SRS",
  "Rms Div Att",
  "Senior Stateroom Steward",
  "Housekeeping Supervisor",
  "Laundry Attendant",
  "Public Area Attendant",
  "Linen Keeper",
  "Other",
];

const formatDate = (date: Date) => {
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
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const parseFormattedDate = (str: string): Date | null => {
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const parts = str.trim().split(" ");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = months[parts[1]];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
};

const computeDuration = (signOnStr: string, signOffStr: string): string => {
  const start = parseFormattedDate(signOnStr);
  const end = parseFormattedDate(signOffStr);
  if (!start || !end || end <= start) return "";
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const afterMonths = new Date(
    start.getFullYear(),
    start.getMonth() + months,
    start.getDate(),
  );
  let days = Math.floor(
    (end.getTime() - afterMonths.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) {
    months -= 1;
    const afterAdjusted = new Date(
      start.getFullYear(),
      start.getMonth() + months,
      start.getDate(),
    );
    days = Math.floor(
      (end.getTime() - afterAdjusted.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  return parts.join(", ") || "Less than 1 day";
};

export default function EditScreen() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const [showWarning, setShowWarning] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const warningDismissed = useRef(false);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const [scanId, setScanId] = useState("");
  const [empNo, setEmpNo] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [position, setPosition] = useState("");
  const [signOn, setSignOn] = useState("");
  const [signOff, setSignOff] = useState("");
  const [contractDuration, setContractDuration] = useState("");

  const [showSignOnPicker, setShowSignOnPicker] = useState(false);
  const [showSignOffPicker, setShowSignOffPicker] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanInput, setScanInput] = useState("");

  const [notRegisteredModal, setNotRegisteredModal] = useState(false);
  const [scannedUnknownId, setScannedUnknownId] = useState("");

  const handleScanInput = (text: string) => {
    setScanInput(text);
    if (text.endsWith("\n") || text.endsWith("\r")) {
      const cardNo = text.replace(/[\r\n]/g, "").trim();
      const all = getAllEmployees() as any[];
      const found = all.find((e) => e.card_no === cardNo);
      if (found) {
        setScanModalVisible(false);
        setScanInput("");
        setResults([]);
        setSearch(`${found.emp_no} — ${found.last_name}, ${found.first_name}`);
        if (warningDismissed.current) {
          populateForm(found);
        } else {
          setPendingEmployee(found);
          setShowWarning(true);
        }
      } else {
        setScannedUnknownId(cardNo);
        setNotRegisteredModal(true);
        setScanInput("");
      }
      return;
    }
    if (text.length >= 10) {
      const all = getAllEmployees() as any[];
      const found = all.find((e) => e.card_no === text.trim());
      if (found) {
        setScanModalVisible(false);
        setScanInput("");
        setResults([]);
        setSearch(`${found.emp_no} — ${found.last_name}, ${found.first_name}`);
        if (warningDismissed.current) {
          populateForm(found);
        } else {
          setPendingEmployee(found);
          setShowWarning(true);
        }
      }
    }
  };

  const populateForm = (employee: any) => {
    setSelected(employee);
    setSearch(
      `${employee.emp_no} — ${employee.last_name}, ${employee.first_name}`,
    );
    setResults([]);
    setScanId(employee.card_no ?? "");
    setEmpNo(employee.emp_no ?? "");
    setLastName(employee.last_name ?? "");
    setFirstName(employee.first_name ?? "");
    setMiddleName(employee.middle_name ?? "");
    setSuffix(employee.suffix ?? "");
    setPosition(employee.position ?? "");
    setSignOn(employee.sign_on ?? "");
    setSignOff(employee.sign_off ?? "");
    setContractDuration(employee.contract_duration ?? "");
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    setSelected(null);
    if (text.length === 0) {
      setResults([]);
      return;
    }
    const all = getAllEmployees() as any[];
    setResults(
      all.filter(
        (e) =>
          e.emp_no.toLowerCase().includes(text.toLowerCase()) ||
          e.last_name.toLowerCase().includes(text.toLowerCase()) ||
          e.first_name.toLowerCase().includes(text.toLowerCase()),
      ),
    );
  };

  const handleSelect = (employee: any) => {
    setResults([]);
    setSearch(
      `${employee.emp_no} — ${employee.last_name}, ${employee.first_name}`,
    );
    if (warningDismissed.current) {
      populateForm(employee);
    } else {
      setPendingEmployee(employee);
      setShowWarning(true);
    }
  };

  const handleWarningOk = () => {
    if (dontAskAgain) warningDismissed.current = true;
    setShowWarning(false);
    if (pendingEmployee) populateForm(pendingEmployee);
    setPendingEmployee(null);
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
    setPendingEmployee(null);
    setSearch("");
  };

  const handleSignOnChange = (date: Date) => {
    const formatted = formatDate(date);
    setSignOn(formatted);
    if (signOff) setContractDuration(computeDuration(formatted, signOff));
  };

  const handleSignOffChange = (date: Date) => {
    const formatted = formatDate(date);
    setSignOff(formatted);
    if (signOn) setContractDuration(computeDuration(signOn, formatted));
  };

  const handleUpdate = async () => {
    if (!selected) {
      Alert.alert("Error", "Please select an employee first.");
      return;
    }
    try {
      updateEmployee(
        empNo,
        scanId,
        lastName,
        firstName,
        middleName,
        suffix,
        position,
        signOn,
        signOff,
        contractDuration,
      );
      if (isOnline) {
        try {
          await syncSingleEmployee(empNo);
        } catch {}
      }
      Alert.alert("Success", "Employee updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to update employee.");
    }
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
          <Text style={styles.topBarTitle}>Edit Entry</Text>
          <Text style={styles.topBarSub}>
            {selected
              ? `Editing: ${selected.last_name}, ${selected.first_name}`
              : "Search to select employee"}
          </Text>
        </View>
        <View style={styles.backBtnSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="search-outline" size={14} color="#3b6ea5" />
          <Text style={styles.sectionLabel}>Search Employee</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Name or Employee No</Text>
          <TextInput
            style={styles.input}
            value={search}
            onChangeText={handleSearch}
            placeholder="Type name or employee number..."
            placeholderTextColor="#93c5fd"
          />
          {results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.resultItem,
                    index === results.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.resultIconWrap}>
                    <Ionicons name="person-outline" size={16} color="#3b6ea5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultText}>
                      {item.last_name}, {item.first_name}
                    </Text>
                    <Text style={styles.resultSub}>
                      {item.emp_no} · {item.position}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={14}
                    color="#93c5fd"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

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

        {selected && (
          <>
            {/* ── RFID Info ── */}
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={14} color="#3b6ea5" />
              <Text style={styles.sectionLabel}>RFID Information</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Scan ID</Text>
              <TextInput
                style={styles.input}
                value={scanId}
                onChangeText={setScanId}
                placeholderTextColor="#93c5fd"
              />
              <Text style={styles.label}>Employee No</Text>
              <View style={styles.disabledField}>
                <Text style={styles.disabledText}>{empNo}</Text>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color="#94a3b8"
                />
              </View>
            </View>

            {/* ── Personal Info ── */}
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={14} color="#3b6ea5" />
              <Text style={styles.sectionLabel}>Personal Information</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowHalf}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholderTextColor="#93c5fd"
                  />
                </View>
                <View style={styles.rowHalf}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholderTextColor="#93c5fd"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowHalf}>
                  <Text style={styles.label}>
                    Middle Name{" "}
                    <Text style={styles.optionalTag}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    value={middleName}
                    onChangeText={setMiddleName}
                    placeholderTextColor="#93c5fd"
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.label}>
                    Suffix <Text style={styles.optionalTag}>(opt.)</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    value={suffix}
                    onChangeText={setSuffix}
                    placeholder="Jr., III"
                    placeholderTextColor="#93c5fd"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>Position</Text>
              <TouchableOpacity
                style={[styles.dropdown, { marginBottom: 0 }]}
                onPress={() => setShowPositionModal(true)}
              >
                <Text
                  style={
                    position ? styles.dropdownText : styles.dropdownPlaceholder
                  }
                >
                  {position || "Select position..."}
                </Text>
                <Ionicons
                  name="chevron-down-outline"
                  size={16}
                  color="#3b6ea5"
                />
              </TouchableOpacity>
            </View>

            {/* ── Contract Details ── */}
            <View style={styles.sectionHeader}>
              <Ionicons
                name="document-text-outline"
                size={14}
                color="#3b6ea5"
              />
              <Text style={styles.sectionLabel}>Contract Details</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowHalf}>
                  <Text style={styles.label}>Sign On Date</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, { marginBottom: 0 }]}
                    onPress={() => setShowSignOnPicker(true)}
                  >
                    <Text
                      style={
                        signOn
                          ? styles.dropdownText
                          : styles.dropdownPlaceholder
                      }
                    >
                      {signOn || "Select..."}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#3b6ea5"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.rowHalf}>
                  <Text style={styles.label}>Sign Off Date</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, { marginBottom: 0 }]}
                    onPress={() => setShowSignOffPicker(true)}
                  >
                    <Text
                      style={
                        signOff
                          ? styles.dropdownText
                          : styles.dropdownPlaceholder
                      }
                    >
                      {signOff || "Select..."}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#3b6ea5"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>Contract Duration</Text>
              <View
                style={[
                  styles.durationBox,
                  contractDuration ? styles.durationBoxFilled : {},
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={contractDuration ? "#1e3a5f" : "#93c5fd"}
                />
                <Text
                  style={
                    contractDuration
                      ? styles.durationText
                      : styles.durationPlaceholder
                  }
                >
                  {contractDuration || "Auto-computed from dates..."}
                </Text>
              </View>
            </View>

            {/* ── Action Buttons ── */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => router.back()}
              >
                <Ionicons name="close-outline" size={18} color="#1e3a5f" />
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnUpdate} onPress={handleUpdate}>
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.btnText}>Update Entry</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      {/* ── Warning Modal ── */}
      <WarningModal
        visible={showWarning}
        title="Heads Up"
        message={`You are about to edit an employee record.\n\nMake sure all changes are correct before saving.`}
        boldPhrases={["edit"]}
        accentColor="#1e3a5f"
        okBgColor="#1e3a5f"
        dontAskAgain={dontAskAgain}
        onToggleDontAsk={() => setDontAskAgain(!dontAskAgain)}
        onCancel={handleWarningCancel}
        onOk={handleWarningOk}
      />
      {showSignOnPicker && (
        <DateTimePicker
          mode="date"
          display="calendar"
          value={new Date()}
          onChange={(_, date) => {
            setShowSignOnPicker(false);
            if (date) handleSignOnChange(date);
          }}
        />
      )}
      {showSignOffPicker && (
        <DateTimePicker
          mode="date"
          display="calendar"
          value={new Date()}
          onChange={(_, date) => {
            setShowSignOffPicker(false);
            if (date) handleSignOffChange(date);
          }}
        />
      )}
      <Modal visible={showPositionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Position</Text>
              <TouchableOpacity onPress={() => setShowPositionModal(false)}>
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color="#3b6ea5"
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={POSITIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setPosition(item);
                    setShowPositionModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {position === item && (
                    <Ionicons
                      name="checkmark-outline"
                      size={16}
                      color="#1e3a5f"
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── Not Registered Modal ── */}
      <NotRegisteredModal
        visible={notRegisteredModal}
        scannedId={scannedUnknownId}
        onDismiss={() => {
          setNotRegisteredModal(false);
          setScannedUnknownId("");
          setScanModalVisible(false);
        }}
      />

      {/* ── Scan Modal ── */}
      <ScanModal
        visible={scanModalVisible}
        scanInput={scanInput}
        onChangeText={handleScanInput}
        onCancel={() => setScanModalVisible(false)}
      />
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

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 16,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3b6ea5",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  container: { padding: 16, paddingBottom: 48 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: "#f0f7ff", marginVertical: 14 },
  row: { flexDirection: "row", gap: 12 },
  rowHalf: { flex: 1 },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b6ea5",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  optionalTag: {
    fontSize: 10,
    fontWeight: "400",
    color: "#93c5fd",
    fontStyle: "italic",
    textTransform: "none",
  },

  input: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: "#1e3a5f",
    marginBottom: 12,
    backgroundColor: "#f8fbff",
  },
  disabledField: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 11,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  disabledText: { fontSize: 14, color: "#94a3b8" },
  dropdown: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    padding: 11,
    marginBottom: 12,
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: { fontSize: 14, color: "#1e3a5f", flex: 1 },
  dropdownPlaceholder: { fontSize: 14, color: "#93c5fd", flex: 1 },

  durationBox: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    padding: 11,
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  durationBoxFilled: { borderColor: "#1e3a5f", backgroundColor: "#e8f4ff" },
  durationText: { fontSize: 14, color: "#1e3a5f", fontWeight: "700", flex: 1 },
  durationPlaceholder: { fontSize: 14, color: "#93c5fd", flex: 1 },

  resultsList: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f7ff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resultIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: { fontSize: 14, color: "#1e3a5f", fontWeight: "600" },
  resultSub: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },

  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  btnUpdate: {
    backgroundColor: "#1e3a5f",
    padding: 15,
    borderRadius: 10,
    flex: 1.6,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnCancel: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbeafe",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  btnCancelText: { color: "#1e3a5f", fontWeight: "700", fontSize: 15 },

  btnScan: {
    backgroundColor: "#2d5a8e",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  btnScanText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },

  // ── Position picker modal (local to edit.tsx) ────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "65%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f7ff",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e3a5f" },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fbff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalItemText: { fontSize: 15, color: "#1e3a5f" },
});
