import axios from "axios";
import { auth } from "./firebase";

// Axios instance that automatically attaches the Firebase ID token to every request
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
