import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, Text, View, Alert } from "react-native";
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from "react-native";

export default function App() {
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
        // setPictureSizes("1280x720")
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
        
        
        if (photo?.base64) {
          // const resizedPhoto = await resizeImageToFit(photo.uri, 1280, 720)
          alert(`Photo captured: ${photo.width}x${photo.height}`);
          console.log()
          // uploadImage(photo.uri)
          uploadImageToBackend(photo.base64);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to capture photo.");
      }
    }
  };

  const uploadImage = async (uri: string) => {
    const formData = new FormData();
  
    // Fetch the file from URI
    const response = await fetch(uri);
    const blob = await response.blob(); // Convert to a Blob object
  
    // Append the Blob to FormData
    formData.append("image", blob, "photo.jpg"); // You can replace "photo.jpg" with your preferred filename
  
    try {
      const apiUrl = "http://10.74.126.23:5000/api/items/image/upload";
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
  
      if (res.ok) {
        console.log("Upload Success:", data);
        // You can use the filePath from the response to display or store the image
      } else {
        console.error("Upload failed:", data);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };
  
  const uploadImageToBackend = async (base64Image: string): Promise<void> => {
    try {
      // Ensure the base64Image has the proper prefix
      const formattedImage = base64Image.startsWith('data:image')
        ? base64Image
        : `data:image/jpeg;base64,${base64Image}`;
      
  
      const response = await fetch("http://10.74.126.23:5000/api/items/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: formattedImage }), // Send the formatted image
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("OCR Response:", data);
    } catch (error) {
      console.error("Error uploading image:", error);
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
