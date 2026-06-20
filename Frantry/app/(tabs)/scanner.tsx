import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { Button, Card, ActivityIndicator as PaperActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "@/lib/api";

type ParsedItem = {
  name: string;
  daysUntilExpiration: number;
  expiryLevel: "low" | "medium" | "high";
};

type ScanMode = "camera" | "processing" | "confirming";

export default function Scanner() {
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>("camera");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [processingStep, setProcessingStep] = useState("");

  if (Platform.OS === "web" && typeof window !== "undefined" && !window.isSecureContext) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera requires a secure connection (HTTPS).</Text>
        <Text style={styles.permissionSubText}>
          This works on the deployed Vercel site. For local testing, use localhost.
        </Text>
      </View>
    );
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#C8E6C9" />
        <Text style={styles.permissionText}>Camera access needed</Text>
        <Text style={styles.permissionSubText}>
          Grant camera permission to scan grocery receipts
        </Text>
        <Button mode="contained" onPress={requestPermission} style={styles.grantButton}>
          Grant Permission
        </Button>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      if (!photo?.base64) {
        Alert.alert("Error", "Could not capture photo. Please try again.");
        return;
      }
      await processImage(photo.base64);
    } catch (error) {
      console.error("takePhoto error:", error);
      Alert.alert("Error", "Failed to capture photo.");
    }
  };

  const processImage = async (base64: string) => {
    setMode("processing");
    try {
      setProcessingStep("Reading receipt…");
      const response = await api.post("/api/items/scan", { image: base64 });
      const items: ParsedItem[] = response.data.items;

      if (!items || items.length === 0) {
        Alert.alert(
          "No Items Found",
          "Could not detect food items on this receipt. Try a clearer photo with better lighting.",
          [{ text: "Try Again", onPress: () => setMode("camera") }]
        );
        return;
      }

      setParsedItems(items);
      setMode("confirming");
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        "Could not read receipt — please try again in better lighting";
      Alert.alert("Scan Failed", msg, [{ text: "Try Again", onPress: () => setMode("camera") }]);
      setMode("camera");
    }
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: string | number) => {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmAndSave = async () => {
    if (parsedItems.length === 0) {
      setMode("camera");
      return;
    }
    setMode("processing");
    setProcessingStep("Saving to pantry…");
    try {
      await api.post("/api/items/scannedData", parsedItems);
      Alert.alert("Success", `${parsedItems.length} item(s) added to your pantry!`, [
        { text: "Done", onPress: () => setMode("camera") },
      ]);
    } catch {
      Alert.alert("Error", "Could not save items. Please try again.", [
        { text: "OK", onPress: () => setMode("confirming") },
      ]);
    }
  };

  if (mode === "processing") {
    return (
      <View style={styles.centered}>
        <Card style={styles.processingCard}>
          <Card.Content style={styles.processingContent}>
            <PaperActivityIndicator animating size="large" color="#2E7D32" />
            <Text style={styles.processingText}>{processingStep || "Processing…"}</Text>
            <Text style={styles.processingSubText}>This may take a few seconds</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (mode === "confirming") {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.confirmContainer}>
          <View style={styles.confirmHeader}>
            <Text style={styles.confirmTitle}>Review Items</Text>
            <Text style={styles.confirmSubtitle}>
              {parsedItems.length} item{parsedItems.length !== 1 ? "s" : ""} detected — edit or
              remove before saving
            </Text>
          </View>

          <FlatList
            data={parsedItems}
            keyExtractor={(_, i) => String(i)}
            style={styles.confirmList}
            contentContainerStyle={{ gap: 10, padding: 16 }}
            renderItem={({ item, index }) => (
              <View style={styles.confirmCard}>
                <View style={styles.confirmCardRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={item.name}
                    onChangeText={(v) => updateItem(index, "name", v)}
                    placeholder="Item name"
                  />
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    style={styles.removeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#EF9A9A" />
                  </TouchableOpacity>
                </View>
                <View style={styles.confirmCardRow}>
                  <Text style={styles.daysLabel}>Days until expiry:</Text>
                  <TextInput
                    style={styles.daysInput}
                    value={String(item.daysUntilExpiration)}
                    keyboardType="number-pad"
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 0) updateItem(index, "daysUntilExpiration", n);
                    }}
                  />
                  <ExpiryBadge level={item.expiryLevel} />
                </View>
              </View>
            )}
          />

          <View style={styles.confirmFooter}>
            <Button
              mode="outlined"
              onPress={() => setMode("camera")}
              style={styles.cancelButton}
              textColor="#757575"
            >
              Rescan
            </Button>
            <Button
              mode="contained"
              onPress={confirmAndSave}
              style={styles.saveButton}
              disabled={parsedItems.length === 0}
              buttonColor="#2E7D32"
            >
              Save {parsedItems.length} Item{parsedItems.length !== 1 ? "s" : ""}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Viewfinder overlay */}
        <View style={styles.viewfinderOverlay}>
          <View style={styles.viewfinder} />
          <Text style={styles.viewfinderHint}>Align receipt within frame</Text>
        </View>
      </CameraView>

      <View style={styles.cameraControls}>
        <TouchableOpacity style={styles.flipButton} onPress={() => setFacing(facing === "back" ? "front" : "back")}>
          <MaterialCommunityIcons name="camera-flip-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={{ width: 48 }} />
      </View>
    </View>
  );
}

function ExpiryBadge({ level }: { level: string }) {
  const color = level === "high" ? "#C62828" : level === "medium" ? "#F9A825" : "#2E7D32";
  const label = level === "high" ? "Urgent" : level === "medium" ? "Soon" : "Fresh";
  return (
    <View style={[styles.expiryBadge, { backgroundColor: color }]}>
      <Text style={styles.expiryBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 32,
    backgroundColor: "#F8FAF8",
  },
  permissionText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#212121",
  },
  permissionSubText: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
  },
  grantButton: {
    marginTop: 8,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
  },
  processingCard: {
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    minWidth: 260,
  },
  processingContent: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  processingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
  },
  processingSubText: {
    fontSize: 13,
    color: "#9E9E9E",
  },
  // Camera UI
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  viewfinderOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  viewfinder: {
    width: "85%",
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
  },
  viewfinderHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  cameraControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 32,
    paddingHorizontal: 40,
    backgroundColor: "#000",
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  // Confirm UI
  confirmContainer: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },
  confirmHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8F5E9",
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B5E20",
  },
  confirmSubtitle: {
    fontSize: 14,
    color: "#757575",
    marginTop: 4,
  },
  confirmList: {
    flex: 1,
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  confirmCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingBottom: 4,
  },
  removeButton: {
    padding: 4,
  },
  daysLabel: {
    fontSize: 13,
    color: "#757575",
  },
  daysInput: {
    width: 52,
    fontSize: 15,
    fontWeight: "600",
    color: "#2E7D32",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 8,
    padding: 6,
    textAlign: "center",
  },
  expiryBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  expiryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  confirmFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8F5E9",
  },
  cancelButton: {
    flex: 1,
    borderColor: "#BDBDBD",
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
  },
});
