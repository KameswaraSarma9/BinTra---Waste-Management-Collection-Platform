import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5050";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}

export function joinUserRoom(userId) {
  if (!userId) return;
  getSocket().emit("join", userId);
}