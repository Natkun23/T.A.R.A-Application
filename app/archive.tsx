// app/delete.tsx
import ArchiveConfirmModal from "@/components/modals/ArchiveConfirmModal";
import NotRegisteredModal from "@/components/modals/NotRegisteredModal";
import ScanModal from "@/components/modals/ScanModal";
import WarningModal from "@/components/modals/WarningModal";
import { archiveEmployee, getAllEmployees } from "@/database/db";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function DeleteScreen() {
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const warningDismissed = useRef(false);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

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
          setSelected(found);
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
          setSelected(found);
        } else {
          setPendingEmployee(found);
          setShowWarning(true);
        }
      }
    }
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
      setSelected(employee);
    } else {
      setPendingEmployee(employee);
      setShowWarning(true);
    }
  };

  const handleWarningOk = () => {
    if (dontAskAgain) warningDismissed.current = true;
    setShowWarning(false);
    if (pendingEmployee) setSelected(pendingEmployee);
    setPendingEmployee(null);
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
    setPendingEmployee(null);
    setSearch("");
  };

  const handleArchive = async () => {
    if (!selected) return;
    try {
      archiveEmployee(selected.emp_no);
      // No cloud sync here — archive is local only.
      // Cloud delete only happens on permanent delete in archived.tsx.
      setShowArchiveConfirm(false);
      setSelected(null);
      setSearch("");
      Alert.alert(
        "Employee Archived",
        `${selected.last_name}, ${selected.first_name} has been archived.\n\nTheir record will be kept for 6 months in case they return.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch {
      setShowArchiveConfirm(false);
      Alert.alert("Error", "Failed to archive employee. Please try again.");
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
          <Text style={styles.topBarTitle}>Archive Employee</Text>
          <Text style={styles.topBarSub}>
            {selected
              ? `Selected: ${selected.last_name}, ${selected.first_name}`
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
                    <Ionicons name="person-outline" size={16} color="#f59e0b" />
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

        {/* ── Employee Detail Card ── */}
        {selected && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="archive-outline" size={14} color="#f59e0b" />
              <Text style={[styles.sectionLabel, { color: "#f59e0b" }]}>
                Employee to Archive
              </Text>
            </View>
            <View style={[styles.card, styles.archiveCard]}>
              {/* Name Hero */}
              <View style={styles.nameHero}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {selected.first_name?.[0]}
                    {selected.last_name?.[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroName}>
                    {selected.last_name}, {selected.first_name}
                    {selected.suffix ? ` ${selected.suffix}` : ""}
                  </Text>
                  <Text style={styles.heroSub}>{selected.position}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {[
                { label: "Scan ID", value: selected.card_no },
                { label: "Employee No", value: selected.emp_no },
                ...(selected.middle_name
                  ? [{ label: "Middle Name", value: selected.middle_name }]
                  : []),
                { label: "Sign On", value: selected.sign_on },
                { label: "Sign Off", value: selected.sign_off },
                { label: "Duration", value: selected.contract_duration },
              ].map((row, i, arr) => (
                <View
                  key={row.label}
                  style={[
                    styles.detailRow,
                    i === arr.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#3b6ea5"
              />
              <Text style={styles.infoBannerText}>
                Archived employees are hidden from active lists but their
                records and attendance logs are kept for 6 months.
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => router.back()}
              >
                <Ionicons name="close-outline" size={18} color="#1e3a5f" />
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnArchive}
                onPress={() => setShowArchiveConfirm(true)}
              >
                <Ionicons name="archive-outline" size={18} color="#ffffff" />
                <Text style={styles.btnArchiveText}>Archive</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Entry Warning Modal ── */}
      <WarningModal
        visible={showWarning}
        title="Archive Employee?"
        message={`You are about to archive this employee record.\n\nThe employee will be hidden from active lists but their data and attendance logs will be kept for 6 months. You can restore them anytime within that period.`}
        boldPhrases={["archive", "hidden from active lists", "6 months"]}
        accentColor="#f59e0b"
        dontAskAgain={dontAskAgain}
        onToggleDontAsk={() => setDontAskAgain(!dontAskAgain)}
        onCancel={handleWarningCancel}
        onOk={handleWarningOk}
      />

      {/* ── Archive Confirm Modal ── */}
      <ArchiveConfirmModal
        visible={showArchiveConfirm}
        employee={selected}
        onCancel={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
      />

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
  archiveCard: {
    borderColor: "#fde68a",
    borderWidth: 1.5,
  },
  divider: { height: 1, backgroundColor: "#f0f7ff", marginVertical: 14 },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b6ea5",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: "#1e3a5f",
    marginBottom: 8,
    backgroundColor: "#f8fbff",
  },

  nameHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 17, fontWeight: "700", color: "#f59e0b" },
  heroName: { fontSize: 17, fontWeight: "700", color: "#1e3a5f" },
  heroSub: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fbff",
  },
  detailLabel: { fontSize: 13, color: "#3b6ea5", fontWeight: "600", flex: 1 },
  detailValue: { fontSize: 13, color: "#1e3a5f", flex: 2, textAlign: "right" },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#3b6ea5",
    lineHeight: 18,
  },

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
    backgroundColor: "#fffbeb",
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: { fontSize: 14, color: "#1e3a5f", fontWeight: "600" },
  resultSub: { fontSize: 12, color: "#3b6ea5", marginTop: 2 },

  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  btnArchive: {
    backgroundColor: "#f59e0b",
    padding: 15,
    borderRadius: 10,
    flex: 1.6,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnArchiveText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
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
});
