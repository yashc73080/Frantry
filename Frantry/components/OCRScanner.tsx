import React, { useState } from "react";
import { View, Button, Image, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

const OCRScanner = ({ onExtractedText }: { onExtractedText: (text: string) => void }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");

  // Pick image from gallery or camera
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,  // Required for sending to Google Vision API
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      processImage(result.assets[0].base64 || "");
    }
  };

  // Send image to Google Cloud Vision API
  const processImage = async (base64: string) => {
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }
      );

      const extractedText = response.data.responses[0].fullTextAnnotation?.text || "";
      setExtractedText(extractedText);
      onExtractedText(extractedText);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  return (
    <View>
      <Button title="Upload Receipt" onPress={pickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: 200, height: 200 }} />}
      <Text>{extractedText}</Text>
    </View>
  );
};

export default OCRScanner;
