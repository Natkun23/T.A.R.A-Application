// components/modals/ScanModal.tsx
import { Ionicons } from "@expo/vector-icons";
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  scanInput: string;
  onChangeText: (text: string) => void;
  onCancel: () => void;
};

export default function ScanModal({
  visible,
  scanInput,
  onChangeText,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.scanModalBox}>
          <View style={styles.modalIconCircle}>
            <Ionicons name="scan-outline" size={32} color="#1e3a5f" />
          </View>
          <Text style={styles.scanModalTitle}>Scan RFID Card</Text>
          <Text style={styles.scanModalSub}>Tap your card on the scanner</Text>
          <TextInput
            style={styles.scanInput}
            value={scanInput}
            onChangeText={onChangeText}
            placeholder="Waiting for scan..."
            placeholderTextColor="#93c5fd"
            autoFocus
            showSoftInputOnFocus={false}
          />
          <TouchableOpacity style={styles.scanModalCancel} onPress={onCancel}>
            <Text style={styles.scanModalCancelText}>Cancel</Text>
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
  scanModalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    width: "82%",
    alignItems: "center",
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
  scanModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 6,
  },
  scanModalSub: {
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
});
