// src/api/axios.js
import axios from "axios";

const instance = axios.create({
  // baseURL: "http://localhost:9002/api", // Change this to your backend's base URL
  baseURL: "http://127.0.0.1:8000/api", // Change this to your backend's base URL

  headers: {
    "Content-Type": "application/json",
  },
});

export default instance;

