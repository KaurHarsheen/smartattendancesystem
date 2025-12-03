import axios from "axios";
import { useAuthStore } from "../store/auth";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://smartattendancesystem-fx41.onrender.com",
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export default client;


