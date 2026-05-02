// app/add.tsx
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { addEmployee } from "../database/db";
import { syncSingleEmployee } from "../database/sync";

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
  const dateParts = str.trim().split(" ");
  if (dateParts.length !== 3) return null;
  const day = parseInt(dateParts[0], 10);
  const month = months[dateParts[1]];
  const year = parseInt(dateParts[2], 10);
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

export default function AddScreen() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const [scanId, setScanId] = useState("");
  const [empNo, setEmpNo] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [position, setPosition] = useState("");
  const [customPosition, setCustomPosition] = useState("");
  const [signOn, setSignOn] = useState("");
  const [signOff, setSignOff] = useState("");
  const [contractDuration, setContractDuration] = useState("");
  const [showSignOnPicker, setShowSignOnPicker] = useState(false);
  const [showSignOffPicker, setShowSignOffPicker] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showRfidNoteModal, setShowRfidNoteModal] = useState(false);

  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanInput, setScanInput] = useState("");

  useEffect(() => {
    setShowRfidNoteModal(true);
  }, []);

  const handleScanInput = (text: string) => {
    setScanInput(text);
    if (text.endsWith("\n") || text.endsWith("\r")) {
      const cardNo = text.replace(/[\r\n]/g, "").trim();
      setScanId(cardNo);
      setScanModalVisible(false);
      setScanInput("");
      return;
    }
    if (text.length >= 10) {
      setScanId(text.trim());
      setScanModalVisible(false);
      setScanInput("");
    }
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

  const handleSave = async () => {
    if (!scanId || !empNo || !lastName || !firstName) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    if (!signOn || !signOff) {
      Alert.alert(
        "Missing Dates",
        "Please select both Sign On and Sign Off dates.",
      );
      return;
    }
    const finalPosition = position === "Other" ? customPosition : position;
    try {
      addEmployee(
        scanId,
        empNo,
        lastName,
        firstName,
        middleName,
        suffix,
        finalPosition,
        signOn,
        signOff,
        contractDuration,
      );
      if (isOnline) {
        try {
          await syncSingleEmployee(empNo);
        } catch {}
      }
      Alert.alert("Success", "Employee added successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save. Employee may already exist.");
    }
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Add Entry</Text>
          <Text style={styles.topBarSub}>New employee record</Text>
        </View>
        <View style={styles.backBtnSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={14} color="#3b6ea5" />
          <Text style={styles.sectionLabel}>RFID Information</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              Scan ID <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity onPress={() => setShowRfidNoteModal(true)}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#3b6ea5"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.scanRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={scanId}
              onChangeText={setScanId}
              placeholder="Scan or type card number..."
              placeholderTextColor="#93c5fd"
            />
            <TouchableOpacity
              style={styles.btnScanSmall}
              onPress={() => {
                setScanInput("");
                setScanModalVisible(true);
              }}
            >
              <Ionicons name="scan-outline" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>
            Employee No <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            value={empNo}
            onChangeText={setEmpNo}
            placeholder="e.g. EMP-0001"
            placeholderTextColor="#93c5fd"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={14} color="#3b6ea5" />
          <Text style={styles.sectionLabel}>Personal Information</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <Text style={styles.label}>
                Last Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { marginBottom: 0 }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#93c5fd"
              />
            </View>
            <View style={styles.rowHalf}>
              <Text style={styles.label}>
                First Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { marginBottom: 0 }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#93c5fd"
              />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <Text style={styles.label}>
                Middle Name <Text style={styles.optionalTag}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, { marginBottom: 0 }]}
                value={middleName}
                onChangeText={setMiddleName}
                placeholder="Middle name"
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
          <Text style={styles.label}>
            Position <Text style={styles.required}>*</Text>
          </Text>
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
            <Ionicons name="chevron-down-outline" size={16} color="#3b6ea5" />
          </TouchableOpacity>
          {position === "Other" && (
            <TextInput
              style={[styles.input, { marginTop: 10, marginBottom: 0 }]}
              value={customPosition}
              onChangeText={setCustomPosition}
              placeholder="Specify position..."
              placeholderTextColor="#93c5fd"
            />
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={14} color="#3b6ea5" />
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
                    signOn ? styles.dropdownText : styles.dropdownPlaceholder
                  }
                >
                  {signOn || "Select..."}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#3b6ea5" />
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
                    signOff ? styles.dropdownText : styles.dropdownPlaceholder
                  }
                >
                  {signOff || "Select..."}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#3b6ea5" />
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
              {contractDuration || "Auto-computed from dates above..."}
            </Text>
          </View>
          {(!signOn || !signOff) && (
            <Text style={styles.durationHint}>
              ℹ Select both dates to auto-compute duration
            </Text>
          )}
        </View>

        <Text style={styles.requiredNote}>
          <Text style={styles.required}>*</Text> Required fields
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={() => router.back()}
          >
            <Ionicons name="close-outline" size={18} color="#1e3a5f" />
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
            <Ionicons name="checkmark-outline" size={18} color="#ffffff" />
            <Text style={styles.btnText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                    if (item !== "Other") setCustomPosition("");
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

      <Modal visible={scanModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.rfidNoteBox}>
            <View style={styles.rfidNoteIconCircle}>
              <Ionicons name="scan-outline" size={28} color="#1e3a5f" />
            </View>
            <Text style={styles.rfidNoteTitle}>Scan RFID Card</Text>
            <Text style={styles.rfidNoteText}>
              Tap your card on the scanner to register it.
            </Text>
            <View style={styles.rfidNoteDivider} />
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
              style={styles.scanModalCancel}
              onPress={() => setScanModalVisible(false)}
            >
              <Text style={styles.scanModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRfidNoteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.rfidNoteBox}>
            <View style={styles.rfidNoteIconCircle}>
              <Ionicons name="card-outline" size={28} color="#1e3a5f" />
            </View>
            <Text style={styles.rfidNoteTitle}>Scan RFID First</Text>
            <Text style={styles.rfidNoteText}>
              Before filling in employee information, please scan the employee's
              RFID card first.{"\n\n"}
              This registers the card's unique ID to the employee record.
            </Text>
            <View style={styles.rfidNoteDivider} />
            <TouchableOpacity
              style={styles.rfidNoteBtn}
              onPress={() => setShowRfidNoteModal(false)}
            >
              <Ionicons name="checkmark-outline" size={16} color="#ffffff" />
              <Text style={styles.rfidNoteBtnText}>Got it, Proceed</Text>
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

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  rfidNoteBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "82%",
    alignItems: "center",
    elevation: 10,
  },
  rfidNoteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  rfidNoteTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 10,
  },
  rfidNoteText: {
    fontSize: 13,
    color: "#334155",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  rfidNoteDivider: {
    height: 1,
    backgroundColor: "#dbeafe",
    width: "100%",
    marginBottom: 16,
  },
  rfidNoteBtn: {
    backgroundColor: "#1e3a5f",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rfidNoteBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },

  required: { color: "#ef4444", fontWeight: "700" },
  optionalTag: {
    fontSize: 10,
    fontWeight: "400",
    color: "#93c5fd",
    fontStyle: "italic",
    textTransform: "none",
  },
  requiredNote: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "right",
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
  durationHint: {
    fontSize: 11,
    color: "#93c5fd",
    marginTop: 8,
    fontStyle: "italic",
  },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  btnSave: {
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

  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  btnScanSmall: {
    backgroundColor: "#1e3a5f",
    padding: 11,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: 44,
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
  scanModalCancel: {
    padding: 13,
    backgroundColor: "#fff5f5",
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  scanModalCancelText: { color: "#c0392b", fontWeight: "700", fontSize: 14 },

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
