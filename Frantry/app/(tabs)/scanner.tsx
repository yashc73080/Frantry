import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import axios from 'axios';
import { Button } from 'react-native-paper';

const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyDSO7Puxg9hZ2cxuB_UR19PW_L2CkD87Gs';

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
  
      const extractedText = apiResponse.data.responses[0].fullTextAnnotation.text;
      console.log("Raw OCR Text:", extractedText);
  
      const filteredItems = extractFoodItems(extractedText);
      console.log("Filtered Food Items:", filteredItems);
  
    } catch (error) {
      console.error("Error with OCR:", error);
    }
  };

  // const uploadImageToBackend = async (base64Image: string): Promise<void> => {
  //   try {
  //     const response = await fetch("http://10.74.126.23:5000/image", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ image: base64Image }),
  //     });
  //     const data = await response.json();
  //     console.log("OCR Response:", data);
  //   } catch (error) {
  //     console.error("uploadImageToBackend error:", error);
  //     Alert.alert("Error", "Image upload failed.");
  //   }
  // };

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
