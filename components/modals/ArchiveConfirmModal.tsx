// components/modals/ArchiveConfirmModal.tsx
//
// Final confirmation modal shown just before archiving an employee.
// Used by archive.tsx and accessible from data.tsx if needed.

import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Employee = {
  emp_no: string;
  last_name: string;
  first_name: string;
  position?: string;
};

type Props = {
  visible: boolean;
  employee: Employee | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ArchiveConfirmModal({
  visible,
  employee,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.confirmBox}>
          <View style={styles.confirmIconCircle}>
            <Ionicons name="archive-outline" size={32} color="#f59e0b" />
          </View>
          <Text style={styles.confirmTitle}>Archive Employee?</Text>
          <Text style={styles.confirmText}>
            This employee will be moved to the archive:
          </Text>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightId}>{employee?.emp_no}</Text>
            <Text style={styles.highlightName}>
              {employee?.last_name}, {employee?.first_name}
            </Text>
            <Text style={styles.highlightSub}>{employee?.position}</Text>
          </View>
          <Text style={styles.confirmNote}>
            Record will be kept for 6 months. Restorable if they return.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.btnConfirmCancel}
              onPress={onCancel}
            >
              <Text style={styles.btnConfirmCancelText}>No, Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnConfirmArchive}
              onPress={onConfirm}
            >
              <Text style={styles.btnConfirmArchiveText}>Yes, Archive</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    alignItems: "center",
    elevation: 10,
  },
  confirmIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f59e0b",
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 14,
    textAlign: "center",
  },
  highlightBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderColor: "#fde68a",
    borderRadius: 10,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 14,
  },
  highlightId: {
    fontSize: 12,
    color: "#f59e0b",
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
  },
  confirmButtons: { flexDirection: "row", gap: 10, width: "100%" },
  btnConfirmCancel: {
    flex: 1,
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  btnConfirmCancelText: { color: "#1e3a5f", fontWeight: "700" },
  btnConfirmArchive: {
    flex: 1,
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f59e0b",
  },
  btnConfirmArchiveText: { color: "#ffffff", fontWeight: "700" },
});
