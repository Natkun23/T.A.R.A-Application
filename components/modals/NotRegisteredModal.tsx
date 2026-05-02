// components/modals/NotRegisteredModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  scannedId: string;
  onDismiss: () => void;
};

export default function NotRegisteredModal({
  visible,
  scannedId,
  onDismiss,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.notRegBox}>
          <View style={styles.notRegIconCircle}>
            <Ionicons name="help-circle-outline" size={32} color="#f59e0b" />
          </View>
          <Text style={styles.notRegTitle}>Card Not Registered</Text>
          <Text style={styles.notRegText}>The scanned card ID:</Text>
          <View style={styles.notRegIdBox}>
            <Text style={styles.notRegId}>{scannedId}</Text>
          </View>
          <Text style={styles.notRegText}>
            is not yet registered to any employee.{"\n"}
            Please register it first in Add Entry.
          </Text>
          <View style={styles.notRegDivider} />
          <TouchableOpacity style={styles.notRegBtn} onPress={onDismiss}>
            <Ionicons name="close-outline" size={16} color="#ffffff" />
            <Text style={styles.notRegBtnText}>Got it</Text>
          </TouchableOpacity>
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
