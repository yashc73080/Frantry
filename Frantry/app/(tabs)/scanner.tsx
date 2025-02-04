import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import axios from "axios";
import { Button, Card, ActivityIndicator as PaperActivityIndicator } from "react-native-paper";

const SERVER_URL = "http://10.74.126.23:5000"

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
        const photo = await cameraRef.current.takePictureAsync({ base64: true , quality: 0.5});
        if (photo?.base64) {
          setProcessing(true);  // Set processing to true when photo is taken
          const response = await axios.post(`{$SERVER_URL}/api/items/photo`, {
            image: photo.base64 // Sending the image as a JSON field
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
          setProcessing(false);  // Set processing to false after successful upload
          if (response.data.error == 'false'){
            Alert.alert("Success", "Food data uploaded successfully!");
          }
          else {
            Alert.alert("Error", "An error occurred during processing. Please try again.");
          }
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

