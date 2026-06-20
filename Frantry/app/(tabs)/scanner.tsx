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
  ScrollView,
} from "react-native";
import { Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import api from "@/lib/api";

// Vision API key stays client-side — it was already here before, and the
// LLM / save calls use the backend (api.ts) which adds the auth token.
const VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY!;

type ParsedItem = {
  name: string;
  daysUntilExpiration: number;
  expiryLevel: "low" | "medium" | "high";
};

type ScanStage =
  | "idle"
  | "capturing"  // taking photo
  | "ocr"        // calling Vision API
  | "parsing"    // sending text to backend LLM
  | "saving";    // saving confirmed items

type ScanError = {
  stage: string;
  title: string;
  detail: string;
} | null;

type ScreenMode = "camera" | "processing" | "error" | "confirming";

export default function Scanner() {
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScreenMode>("camera");
  const [stage, setStage] = useState<ScanStage>("idle");
  const [scanError, setScanError] = useState<ScanError>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  if (Platform.OS === "web" && typeof window !== "undefined" && !window.isSecureContext) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="shield-alert-outline" size={64} color="#C8E6C9" />
        <Text style={styles.permissionText}>Camera requires HTTPS</Text>
        <Text style={styles.permissionSubText}>
          Open the deployed Vercel URL to use the camera. Local testing works at localhost.
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
        <Button
          mode="contained"
          onPress={requestPermission}
          style={styles.grantButton}
          buttonColor="#2E7D32"
        >
          Grant Permission
        </Button>
      </View>
    );
  }

  const setError = (stage: string, title: string, detail: string) => {
    setScanError({ stage, title, detail });
    setMode("error");
  };

  const resetToCamera = () => {
    setScanError(null);
    setStage("idle");
    setMode("camera");
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    setStage("capturing");
    setMode("processing");

    try {
      // Use quality 0.4 to keep base64 payload well under 10 MB
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
      });

      if (!photo?.base64) {
        setError(
          "capture",
          "Photo Capture Failed",
          "Could not capture a photo. Make sure the camera has permission and try again."
        );
        return;
      }

      await runOCR(photo.base64);
    } catch (err: any) {
      console.error("[scanner] capture error:", err?.message);
      setError(
        "capture",
        "Photo Capture Failed",
        err?.message || "Unknown error capturing photo."
      );
    }
  };

  const runOCR = async (base64Image: string) => {
    setStage("ocr");

    if (!VISION_API_KEY) {
      setError(
        "config",
        "OCR Not Configured",
        "EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY is not set in your .env.local file."
      );
      return;
    }

    try {
      const visionRes = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            },
          ],
        }
      );

      const extractedText: string | undefined =
        visionRes.data.responses?.[0]?.fullTextAnnotation?.text;

      console.log("[scanner] OCR extracted chars:", extractedText?.length ?? 0);
      console.log("[scanner] OCR preview:", extractedText?.slice(0, 200));

      if (!extractedText || extractedText.trim().length < 5) {
        setError(
          "ocr",
          "No Text Detected",
          "Google Vision could not read any text from the photo. Try these tips:\n\n• Make sure the receipt is fully in frame\n• Use better lighting (avoid glare)\n• Hold the camera steady\n• Ensure the receipt isn't crumpled"
        );
        return;
      }

      await parseItemsFromText(extractedText);
    } catch (err: any) {
      const status = err?.response?.status;
      const body = JSON.stringify(err?.response?.data || {});
      console.error("[scanner] Vision API error:", status, body);

      if (status === 400) {
        setError(
          "ocr",
          "Vision API Error (400)",
          "The image was rejected by Google Vision. The photo may be too small or corrupted. Try again."
        );
      } else if (status === 403) {
        setError(
          "ocr",
          "Vision API Key Invalid (403)",
          "Check that EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY is correct and the Vision API is enabled in Google Cloud Console."
        );
      } else {
        setError(
          "ocr",
          "OCR Failed",
          `Google Vision API returned an error (HTTP ${status ?? "network"}).\n\nDetail: ${body.slice(0, 150)}`
        );
      }
    }
  };

  const parseItemsFromText = async (ocrText: string) => {
    setStage("parsing");

    try {
      const response = await api.post("/api/items/parseReceipt", { ocrText });
      const items: ParsedItem[] = response.data.items;

      console.log("[scanner] parsed items:", items);

      if (!items || items.length === 0) {
        setError(
          "parsing",
          "No Food Items Found",
          "The AI could not identify any food products in the receipt text.\n\nThis can happen with non-food receipts, or if the receipt format is unusual. You can add items manually from the Pantry tab."
        );
        return;
      }

      setParsedItems(items);
      setMode("confirming");
      setStage("idle");
    } catch (err: any) {
      const status = err?.response?.status;
      const serverStage = err?.response?.data?.stage || "unknown";
      const serverMsg = err?.response?.data?.error || err?.message || "Unknown error";

      console.error("[scanner] parseReceipt error:", status, serverMsg);

      if (status === 401) {
        setError(
          "auth",
          "Not Authenticated (401)",
          "Your session may have expired. Go to Settings and sign out, then sign back in."
        );
      } else if (status === 502 && serverStage === "llm") {
        setError(
          "parsing",
          "AI Service Unavailable",
          `The AI model returned an error:\n\n${serverMsg}\n\nTry again in a moment. If this persists, the OpenRouter model may be rate-limited.`
        );
      } else if (status === 0 || !status) {
        setError(
          "network",
          "Network Error",
          "Could not reach the server. Check your internet connection and make sure the backend URL in your .env is correct."
        );
      } else {
        setError(
          "parsing",
          `Parsing Failed (stage: ${serverStage})`,
          serverMsg
        );
      }
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

  const computeExpiryLevel = (days: number): "low" | "medium" | "high" => {
    if (days <= 2) return "high";
    if (days <= 5) return "medium";
    return "low";
  };

  const confirmAndSave = async () => {
    if (parsedItems.length === 0) {
      resetToCamera();
      return;
    }

    setStage("saving");
    setMode("processing");

    try {
      await api.post("/api/items/scannedData", parsedItems);
      Alert.alert(
        "Saved!",
        `${parsedItems.length} item${parsedItems.length !== 1 ? "s" : ""} added to your pantry.`,
        [{ text: "Great!", onPress: resetToCamera }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Unknown error";
      console.error("[scanner] save error:", msg);
      setError(
        "saving",
        "Could Not Save Items",
        `${msg}\n\nYour pantry may not be reachable right now. Check the server connection.`
      );
    }
  };

  // ── Error screen ──────────────────────────────────────────────────────────
  if (mode === "error" && scanError) {
    const stageLabels: Record<string, string> = {
      capture: "Step 1 — Capture",
      ocr: "Step 2 — Read Text",
      parsing: "Step 3 — Identify Items",
      saving: "Step 4 — Save to Pantry",
      auth: "Authentication",
      network: "Network",
      config: "Configuration",
      unknown: "Server Error",
    };
    return (
      <View style={styles.centered}>
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#C62828" />
          <Text style={styles.errorStage}>{stageLabels[scanError.stage] ?? scanError.stage}</Text>
          <Text style={styles.errorTitle}>{scanError.title}</Text>
          <ScrollView style={styles.errorDetailScroll}>
            <Text style={styles.errorDetail}>{scanError.detail}</Text>
          </ScrollView>
          <Button
            mode="contained"
            onPress={resetToCamera}
            style={styles.retryButton}
            buttonColor="#2E7D32"
          >
            Try Again
          </Button>
        </View>
      </View>
    );
  }

  // ── Processing screen ─────────────────────────────────────────────────────
  if (mode === "processing") {
    const stepLabels: Record<ScanStage, string> = {
      idle: "Starting…",
      capturing: "Capturing photo…",
      ocr: "Reading text from receipt…",
      parsing: "Identifying food items with AI…",
      saving: "Saving to your pantry…",
    };
    const stepNumbers: Record<ScanStage, string> = {
      idle: "",
      capturing: "1 / 3",
      ocr: "2 / 3",
      parsing: "3 / 3",
      saving: "Saving",
    };
    return (
      <View style={styles.centered}>
        <View style={styles.processingCard}>
          <MaterialCommunityIcons name="receipt" size={40} color="#2E7D32" />
          <Text style={styles.processingStep}>{stepNumbers[stage]}</Text>
          <Text style={styles.processingLabel}>{stepLabels[stage]}</Text>
          <View style={styles.progressDots}>
            {(["capturing", "ocr", "parsing"] as ScanStage[]).map((s) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  stage === s || (stage === "saving" && s === "parsing")
                    ? styles.dotActive
                    : styles.dotInactive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.processingHint}>This may take up to 30 seconds</Text>
        </View>
      </View>
    );
  }

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (mode === "confirming") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.confirmContainer}>
          <View style={styles.confirmHeader}>
            <Text style={styles.confirmTitle}>Review Scanned Items</Text>
            <Text style={styles.confirmSubtitle}>
              {parsedItems.length} item{parsedItems.length !== 1 ? "s" : ""} detected — tap to
              edit before saving
            </Text>
          </View>

          <FlatList
            data={parsedItems}
            keyExtractor={(_, i) => String(i)}
            style={styles.confirmList}
            contentContainerStyle={{ gap: 10, padding: 16 }}
            renderItem={({ item, index }) => {
              const computed = computeExpiryLevel(item.daysUntilExpiration);
              return (
                <View style={styles.confirmCard}>
                  <View style={styles.confirmRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={item.name}
                      onChangeText={(v) => updateItem(index, "name", v)}
                      placeholder="Item name"
                    />
                    <TouchableOpacity
                      onPress={() => removeItem(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#EF9A9A" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.daysLabel}>Days until expiry</Text>
                    <TextInput
                      style={styles.daysInput}
                      value={String(item.daysUntilExpiration)}
                      keyboardType="number-pad"
                      onChangeText={(v) => {
                        const n = parseInt(v, 10);
                        if (!isNaN(n) && n >= 0) {
                          updateItem(index, "daysUntilExpiration", n);
                          updateItem(index, "expiryLevel", computeExpiryLevel(n));
                        }
                      }}
                    />
                    <ExpiryBadge level={computed} />
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.confirmFooter}>
            <Button
              mode="outlined"
              onPress={resetToCamera}
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

  // ── Camera screen ─────────────────────────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.viewfinderOverlay}>
          <View style={styles.viewfinder} />
          <Text style={styles.viewfinderHint}>Align receipt within frame, then capture</Text>
        </View>
      </CameraView>

      <View style={styles.cameraControls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === "back" ? "front" : "back")}
        >
          <MaterialCommunityIcons name="camera-flip-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        {/* Spacer to balance the flip button */}
        <View style={{ width: 48 }} />
      </View>
    </View>
  );
}

function ExpiryBadge({ level }: { level: string }) {
  const color =
    level === "high" ? "#C62828" : level === "medium" ? "#F9A825" : "#2E7D32";
  const label =
    level === "high" ? "Urgent" : level === "medium" ? "Soon" : "Fresh";
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F8FAF8",
  },
  permissionText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#212121",
    marginTop: 12,
  },
  permissionSubText: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  grantButton: { marginTop: 16, borderRadius: 12 },
  // Error
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  errorStage: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#C62828",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212121",
    textAlign: "center",
  },
  errorDetailScroll: { maxHeight: 200, width: "100%" },
  errorDetail: {
    fontSize: 14,
    color: "#616161",
    lineHeight: 22,
    textAlign: "left",
  },
  retryButton: { marginTop: 8, borderRadius: 12, width: "100%" },
  // Processing
  processingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  processingStep: {
    fontSize: 12,
    fontWeight: "700",
    color: "#81C784",
    letterSpacing: 1,
  },
  processingLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#212121",
    textAlign: "center",
  },
  processingHint: { fontSize: 13, color: "#9E9E9E" },
  progressDots: { flexDirection: "row", gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: "#2E7D32" },
  dotInactive: { backgroundColor: "#C8E6C9" },
  // Camera
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  viewfinderOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  viewfinder: {
    width: "88%",
    aspectRatio: 1.5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: 12,
  },
  viewfinderHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  cameraControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 36,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
  // Confirmation
  confirmContainer: { flex: 1, backgroundColor: "#F8FAF8" },
  confirmHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8F5E9",
  },
  confirmTitle: { fontSize: 24, fontWeight: "700", color: "#1B5E20" },
  confirmSubtitle: { fontSize: 14, color: "#757575", marginTop: 4 },
  confirmList: { flex: 1 },
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
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingBottom: 4,
  },
  daysLabel: { fontSize: 13, color: "#757575" },
  daysInput: {
    width: 56,
    fontSize: 15,
    fontWeight: "700",
    color: "#2E7D32",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 8,
    padding: 6,
    textAlign: "center",
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  confirmFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8F5E9",
  },
  cancelButton: { flex: 1, borderColor: "#BDBDBD" },
  saveButton: { flex: 2, borderRadius: 12 },
});
