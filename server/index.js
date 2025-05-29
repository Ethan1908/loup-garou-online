import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true,
}));

const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('✅ Nouveau joueur connecté:', socket.id);

  socket.on('join-room', ({ username, roomCode }) => {
    const room = roomCode || generateRoomCode();
    socket.join(room);

    if (!rooms[room]) rooms[room] = [];
    rooms[room].push({ id: socket.id, username });

    socket.emit('joined', { room });
    io.to(room).emit('players-update', rooms[room]);

    console.log(`${username} a rejoint la salle ${room}`);
  });

  socket.on('send-message', ({ room, username, message }) => {
    const timestamp = new Date().toISOString();
    console.log(`💬 ${username} dans ${room}: ${message}`);
    io.to(room).emit('receive-message', { username, message, timestamp });
  });

  socket.on('disconnect', () => {
    console.log('❌ Déconnexion :', socket.id);
    for (const room in rooms) {
      const index = rooms[room].findIndex(p => p.id === socket.id);
      if (index !== -1) {
        rooms[room].splice(index, 1);
        io.to(room).emit('players-update', rooms[room]);
        break;
      }
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur http://localhost:${PORT}`);
});
