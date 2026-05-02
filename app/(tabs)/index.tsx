import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#dbeafe" />
      <View style={styles.header}>
        <View
          style={[
            styles.offlineBanner,
            isOnline ? styles.onlineBanner : styles.offlineBannerColor,
          ]}
        >
          <Ionicons
            name={isOnline ? "cloud-done-outline" : "cloud-offline-outline"}
            size={14}
            color="#ffffff"
          />
          <Text style={styles.offlineText}>
            {isOnline ? "Online" : "Offline Mode"}
          </Text>
        </View>
        <Text style={styles.appCode}>T.A.R.A</Text>
        <Text style={styles.appTitle}>
          Time and Attendance Recording Application
        </Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/add")}
        >
          <Ionicons name="person-add-outline" size={28} color="#1e3a5f" />
          <Text style={styles.buttonText}>Add Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/edit")}
        >
          <Ionicons name="create-outline" size={28} color="#1e3a5f" />
          <Text style={styles.buttonText}>Edit Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/data")}
        >
          <Ionicons name="server-outline" size={28} color="#1e3a5f" />
          <Text style={styles.buttonText}>Database</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/track")}
        >
          <Ionicons name="scan-outline" size={28} color="#1e3a5f" />
          <Text style={styles.buttonText}>Track</Text>
        </TouchableOpacity>

        {/* Archive Employee — replaces old Delete Entry */}
        <TouchableOpacity
          style={styles.buttonArchive}
          onPress={() => router.push("/archive")}
        >
          <Ionicons name="archive-outline" size={28} color="#d97706" />
          <Text style={styles.buttonArchiveText}>Archive{"\n"}Employee</Text>
        </TouchableOpacity>

        {/* Archived Employees — view, restore, or permanently delete */}
        <TouchableOpacity
          style={styles.buttonArchived}
          onPress={() => router.push("/archived")}
        >
          <Ionicons name="folder-open-outline" size={28} color="#3b6ea5" />
          <Text style={styles.buttonArchivedText}>Archived{"\n"}Employees</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonExit}
          onPress={() =>
            Alert.alert("Exit", "Are you sure you want to exit?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Exit",
                style: "destructive",
                onPress: () => BackHandler.exitApp(),
              },
            ])
          }
        >
          <Ionicons name="exit-outline" size={28} color="#c0392b" />
          <Text style={styles.buttonExitText}>Exit</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>© 2026 T.A.R.A System</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  header: { alignItems: "center", marginBottom: 40 },
  appCode: {
    fontSize: 42,
    fontWeight: "700",
    color: "#1e3a5f",
    letterSpacing: 6,
  },
  appTitle: {
    fontSize: 11,
    color: "#3b6ea5",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: "#1e3a5f",
    marginTop: 16,
    borderRadius: 2,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  button: {
    backgroundColor: "#ffffff",
    width: 110,
    height: 110,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  buttonArchive: {
    backgroundColor: "#fffbeb",
    width: 110,
    height: 110,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  buttonArchived: {
    backgroundColor: "#eff6ff",
    width: 110,
    height: 110,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  buttonExit: {
    backgroundColor: "#ffffff",
    width: 110,
    height: 110,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e3a5f",
    textAlign: "center",
  },
  buttonArchiveText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d97706",
    textAlign: "center",
  },
  buttonArchivedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b6ea5",
    textAlign: "center",
  },
  buttonExitText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c0392b",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    fontSize: 11,
    color: "#93c5fd",
    letterSpacing: 0.5,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  offlineBannerColor: {
    backgroundColor: "#f59e0b",
  },
  onlineBanner: {
    backgroundColor: "#10b981",
  },
  offlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
});
