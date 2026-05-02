// components/modals/WarningModal.tsx
//
// Shared "you're about to do something sensitive" warning modal.
// Used by both edit.tsx and archive.tsx.
//
// Props:
//  - visible        : show/hide
//  - title          : heading text
//  - message        : body text (supports <WarningBold> via renderMessage)
//  - accentColor    : color of the warning icon + OK button (default amber)
//  - dontAskAgain   : controlled checkbox state
//  - onToggleDontAsk: toggle callback
//  - onCancel       : cancel callback
//  - onOk           : confirm callback
//  - okLabel        : label for OK button (default "OK, Proceed")

import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  boldPhrases?: string[]; // words to highlight in amber inside message
  accentColor?: string;
  okBgColor?: string;
  dontAskAgain: boolean;
  onToggleDontAsk: () => void;
  onCancel: () => void;
  onOk: () => void;
  okLabel?: string;
};

export default function WarningModal({
  visible,
  title,
  message,
  boldPhrases = [],
  accentColor = "#f59e0b",
  okBgColor,
  dontAskAgain,
  onToggleDontAsk,
  onCancel,
  onOk,
  okLabel = "OK, Proceed",
}: Props) {
  const bg = okBgColor ?? accentColor;

  // Render message with bold phrases highlighted
  const renderMessage = () => {
    if (boldPhrases.length === 0)
      return <Text style={styles.warningText}>{message}</Text>;
    const pattern = new RegExp(
      `(${boldPhrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "g",
    );
    const parts = message.split(pattern);
    return (
      <Text style={styles.warningText}>
        {parts.map((part, i) =>
          boldPhrases.includes(part) ? (
            <Text key={i} style={[styles.warningBold, { color: accentColor }]}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          ),
        )}
      </Text>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.warningBox}>
          <View style={styles.warningIconRow}>
            <Ionicons name="warning-outline" size={28} color={accentColor} />
            <Text style={styles.warningTitle}>{title}</Text>
          </View>

          {renderMessage()}

          <TouchableOpacity style={styles.checkRow} onPress={onToggleDontAsk}>
            <View
              style={[
                styles.checkbox,
                dontAskAgain && {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}
            >
              {dontAskAgain && (
                <Ionicons name="checkmark" size={12} color="#ffffff" />
              )}
            </View>
            <Text style={styles.checkLabel}>
              Don't ask me again this session
            </Text>
          </TouchableOpacity>

          <View style={styles.warningButtons}>
            <TouchableOpacity
              style={styles.btnWarningCancel}
              onPress={onCancel}
            >
              <Text style={styles.btnWarningCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnWarningOk, { backgroundColor: bg }]}
              onPress={onOk}
            >
              <Text style={styles.btnWarningOkText}>{okLabel}</Text>
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
  warningBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    elevation: 10,
    alignSelf: "center",
  },
  warningIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: { fontSize: 18, fontWeight: "700", color: "#1e3a5f" },
  warningText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 16,
  },
  warningBold: { fontWeight: "700" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { fontSize: 13, color: "#3b6ea5" },
  warningButtons: { flexDirection: "row", gap: 10 },
  btnWarningCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  btnWarningCancelText: { color: "#1e3a5f", fontWeight: "700" },
  btnWarningOk: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnWarningOkText: { color: "#ffffff", fontWeight: "700" },
});
