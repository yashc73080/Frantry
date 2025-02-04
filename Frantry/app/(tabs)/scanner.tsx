import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import axios from "axios";
import { Button, Card, ActivityIndicator as PaperActivityIndicator } from "react-native-paper";

const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyDSO7Puxg9hZ2cxuB_UR19PW_L2CkD87Gs';
const OPENROUTER_API_KEY = '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'; 

export default function Scanner() {
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [photoTaken, setPhotoTaken] = useState(false);  // State to track photo status
  const [processing, setProcessing] = useState(false);   // New state for loading

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need camera access</Text>
        <Button style={styles.permissionButton} mode="contained" onPress={requestPermission}>
          Grant Permission
        </Button>
      </View>
    );
  }

  const toggleCameraFacing = () => setFacing(facing === "back" ? "front" : "back");

  const takePhoto = async (): Promise<void> => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        if (photo?.base64) {
          ocrImage(photo.base64);
          setPhotoTaken(true);  // Set photoTaken to true after successful capture

          // Reset the photoTaken state after 2 seconds (or any preferred time)
          setTimeout(() => setPhotoTaken(false), 2000);
        }
      } catch (error) {
        console.error("takePhoto error:", error);
        Alert.alert("Error", "Failed to capture photo.");
      }
    }
  };

  const extractFoodItems = (ocrText: string): string[] => {
    const lines = ocrText.split("\n").map(line => line.trim());
    const priceRegex = /\$\d+(\.\d{2})?/;
    const blacklist = new Set([
      "SPECIAL",
      "SUBTOTAL",
      "TOTAL",
      "LOYALTY",
      "CHANGE",
      "CASH",
      "BALANCE",
      "DISCOUNT",
    ]);

    let items: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || blacklist.has(line)) continue;
      if (priceRegex.test(line) && i > 0) {
        const prevLine = lines[i - 1];
        if (
          !priceRegex.test(prevLine) &&
          prevLine.length > 3 &&
          !blacklist.has(prevLine) &&
          !/\d/.test(prevLine)
        ) {
          items.push(prevLine);
        }
      }
    }
    return items;
  };

  const inferExpiry = async (foodItems: string[]) => {
    try {
      const prompt = `For each of the following food items, estimate how many days they will last before they expire. 
Additionally, standardize each food item name to a more common format:
- Convert all uppercase names to title case.
- Remove unnecessary descriptors (e.g., "Brushed Potatoes" → "Potatoes", "Green Apple" → "Apple").
- Generalize names where possible (e.g., "Iceberg Lettuce" → "Lettuce", "Cavendish Banana" → "Banana").

${foodItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Respond **only** in JSON format as an array of objects, each with:
- "name": the standardized food item name
- "daysUntilExpiration": an integer estimate of how many days until it expires
- "expiryLevel": "high" (≤2 days), "medium" (3-5 days), or "low" (≥6 days)

Example JSON Output:
\`\`\`json
[
  {"name": "Banana", "daysUntilExpiration": 5, "expiryLevel": "medium"},
  {"name": "Broccoli", "daysUntilExpiration": 3, "expiryLevel": "medium"}
]
\`\`\`
`;

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "meta-llama/llama-3.2-3b-instruct:free",
          messages: [
            { role: "system", content: "You must respond **only** in JSON format. No extra text, explanations, or formatting." },
            { role: "user", content: prompt },
          ],
          max_tokens: 750,
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const choices = response.data.choices;
      if (!choices || choices.length === 0 || !choices[0].message || !choices[0].message.content) {
        console.error("Invalid response structure:", response.data);
        return [];
      }

      let responseText = choices[0].message.content;
      responseText = responseText.replace(/```json|```/g, "").trim();

      const result = JSON.parse(responseText);
      console.log("Inferred Expiry Data:", result);
      return result;
    } catch (error) {
      console.error("Error inferring expiration:", error);
      return [];
    }
  };

  const sendDataToBackend = async (foodData: any[]) => {
    try {
      const response = await axios.post("http://10.74.87.22:5000/api/items/scannedData", foodData);
      console.log("Data successfully sent to backend:", response.data);
    } catch (error) {
      console.error("Error sending data to backend:", error);
      throw error;
    }
  };

  const ocrImage = async (base64Image: string) => {
    setProcessing(true);
    try {
      const requestPayload = {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      };

      const apiResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        requestPayload
      );

      const extractedText = apiResponse.data.responses[0]?.fullTextAnnotation?.text;
      console.log("Raw OCR Text:", extractedText);

      if (!extractedText) {
        console.error("No text extracted.");
        setProcessing(false);
        return;
      }

      const foodItems = extractFoodItems(extractedText);
      console.log("Filtered Food Items:", foodItems);

      const foodData = await inferExpiry(foodItems);
      console.log("Final Output:", foodData);

      if (foodData.length > 0) {
        await sendDataToBackend(foodData);
        setProcessing(false);
        Alert.alert("Success", "Food data uploaded successfully!");
      } else {
        setProcessing(false);
      }
    } catch (error) {
      console.error("Error with OCR:", error);
      setProcessing(false);
      Alert.alert("Error", "An error occurred during processing. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <Button style={styles.flipButton} mode="outlined" onPress={toggleCameraFacing}>
            Flip
          </Button>
        </View>
      </CameraView>
      <View style={styles.controlsContainer}>
        <Button
          style={styles.captureButton}
          mode="contained"
          onPress={takePhoto}
          icon={photoTaken ? "check" : "camera"} // Show check if photoTaken is true, else camera
        >
          {photoTaken ? "Captured" : "Capture"}
        </Button>
      </View>
      {processing && (
        <View style={styles.loadingOverlay}>
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingCardContent}>
              <PaperActivityIndicator animating={true} size="large" color="#6200ee" />
              <Text style={styles.loadingText}>Processing food data...</Text>
            </Card.Content>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  flipButton: {
    borderRadius: 25,
  },
  captureButton: {
    width: 200,
    height: 50,
    marginVertical: 20,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(0, 0, 0, 0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.25,
    elevation: 5,
  },
  controlsContainer: {
    padding: 20,
    alignItems: "center",
  },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  permissionText: { fontSize: 18, marginBottom: 20 },
  permissionButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingCard: {
    padding: 20,
    borderRadius: 8,
    elevation: 4,
  },
  loadingCardContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#333",
  },
});

