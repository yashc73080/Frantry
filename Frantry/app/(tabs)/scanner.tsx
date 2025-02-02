import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, Text, View, Alert } from "react-native";
import axios from 'axios';


const apiKey = 'AIzaSyDSO7Puxg9hZ2cxuB_UR19PW_L2CkD87Gs'; // Replace with your API key

export default function Scanner() {
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need camera access</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
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


  const ocrImage = async (base64Image:string) => {
    try {
      const requestPayload = {
        requests: [
          {
            image: {
              content: base64Image, // Use the Base64 image directly
            },
            features: [
              {
                type: 'TEXT_DETECTION', // Specify that you want text detection
                maxResults: 1,
              },
            ],
          },
        ],
      };
  
      const apiResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        requestPayload
      );
  
      const text = apiResponse.data.responses[0].fullTextAnnotation.text;
      console.log('Extracted Text:', text);
    } catch (error) {
      console.error('Error with OCR:', error);
    }
  };

  const uploadImageToBackend = async (base64Image: string): Promise<void> => {
    try {
      const response = await fetch("http://10.74.126.23:5000/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      const data = await response.json();
      console.log("OCR Response:", data);
    } catch (error) {
      console.error("uploadImageToBackend error:", error);
      Alert.alert("Error", "Image upload failed.");
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.buttonText}>Flip</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto} />
        <View style={styles.resolutionsContainer}>
          <Text style={styles.resolutionText}>Available Resolutions</Text>
          {/* Add buttons for resolutions here */}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 20,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
  },
  flipButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 12,
    borderRadius: 25,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
    borderWidth: 4,
    borderColor: "gray",
    alignSelf: "center",
    marginVertical: 20,
  },
  controlsContainer: {
    padding: 20,
    alignItems: "center",
  },
  resolutionsContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  resolutionText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  permissionText: { fontSize: 18, marginBottom: 20 },
  permissionButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
  },
});
