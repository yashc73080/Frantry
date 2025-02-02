import axios from "axios";

const BACKEND_URL = "http://localhost:5000/api/items";  // Update with actual backend URL

export const sendItemsToBackend = async (items: { name: string; expiry: string }[]) => {
  try {
    const response = await axios.post(BACKEND_URL, { items });
    return response.data;
  } catch (error) {
    console.error("Error sending data to backend:", error);
    return null;
  }
};
