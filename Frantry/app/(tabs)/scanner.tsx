import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import axios from 'axios';
import { Button } from 'react-native-paper';

const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyDSO7Puxg9hZ2cxuB_UR19PW_L2CkD87Gs';
const OPENROUTER_API_KEY = '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'; 

export default function Scanner() {
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();

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
          alert(`Photo captured: ${photo.width}x${photo.height}`);
          ocrImage(photo.base64);
        }
      } catch (error) {
        console.error("takePhoto error:", error);
        Alert.alert("Error", "Failed to capture photo.");
      }
    }
  };

  const extractFoodItems = (ocrText: string): string[] => {
    // Split text into lines and clean up extra spaces
    const lines = ocrText.split("\n").map(line => line.trim());
  
    // Regex pattern to detect prices (e.g., "$4.99", "-15.00")
    const priceRegex = /\$\d+(\.\d{2})?/;
  
    // Exclude unwanted words
    const blacklist = new Set(["SPECIAL", "SUBTOTAL", "TOTAL", "LOYALTY", "CHANGE", "CASH", "BALANCE", "DISCOUNT"]);
  
    let items: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
  
      // Skip empty lines or unwanted words
      if (!line || blacklist.has(line)) {
        continue;
      }
  
      // If the line contains a price, assume the previous line is the food item
      if (priceRegex.test(line) && i > 0) {
        const prevLine = lines[i - 1];
  
        // Ensure previous line is a valid food item (not price, special words, or numeric values)
        if (!priceRegex.test(prevLine) && prevLine.length > 3 && !blacklist.has(prevLine) && !/\d/.test(prevLine)) {
          items.push(prevLine);
        }
      }
    }
  
    return items;
  };

  // TODO hallucinating, need to maybe include filtering with ai (regex)
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
                    { role: "user", content: prompt }
                ],
                max_tokens: 750,
                temperature: 0.5,
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
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
      const response = await axios.post(
        'http://10.74.87.22:5000/api/items/scannedData',
        foodData
      );
      console.log('Data successfully sent to backend:', response.data);
      Alert.alert('Success', 'Food data uploaded successfully!');
    } catch (error) {
      console.error('Error sending data to backend:', error);
      Alert.alert('Error', 'Failed to send data to server. Please try again.');
    }
  };

  const ocrImage = async (base64Image: string) => {
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
        return;
      }
  
      const foodItems = extractFoodItems(extractedText);
      console.log("Filtered Food Items:", foodItems);
  
      const foodData = await inferExpiry(foodItems);
      console.log("Final Output:", foodData);
  
      if (foodData.length > 0) {
        await sendDataToBackend(foodData);
      }
  
    } catch (error) {
      console.error("Error with OCR:", error);
    }
  };
  
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <Button
            style={styles.flipButton}
            mode="outlined"
            onPress={toggleCameraFacing}
          >
            Flip
          </Button>
        </View>
      </CameraView>
      <View style={styles.controlsContainer}>
        <Button
          style={styles.captureButton}
          mode="contained"
          onPress={takePhoto}
          icon="camera"
        >
          Capture
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  camera: { flex: 1 },
  overlay: {
    position: "relative",
    top: 10,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
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
});
