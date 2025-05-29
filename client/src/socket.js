import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  autoConnect: true,
  transports: ['websocket'],
});

export default socket;
