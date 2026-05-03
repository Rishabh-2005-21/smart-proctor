import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/api";

let sharedSocket;

export const getSocket = () => {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"]
    });
  }

  return sharedSocket;
};

export const ensureSocketConnection = () => {
  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (sharedSocket?.connected) {
    sharedSocket.disconnect();
  }
};

export const socket = getSocket();
