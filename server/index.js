import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

const app = express();
const httpServer = http.createServer(app);

// Configuration CORS
app.use(cors({
  origin: 'https://loup-garou-online.netlify.app',
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = new Server(httpServer, {
  cors: {
    origin: 'https://loup-garou-online.netlify.app',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Définitions des rôles
const ROLES = {
  VILLAGEOIS: { name: "Villageois", team: "village", nightAction: false },
  LOUP_GAROU: { name: "Loup-Garou", team: "loups", nightAction: true },
  VOYANTE: { name: "Voyante", team: "village", nightAction: true },
  CHASSEUR: { name: "Chasseur", team: "village", nightAction: false }
};

const rooms = {};

// Fonction utilitaire pour générer un code de salle
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Attribution des rôles
function assignRoles(playerCount) {
  const roles = [];
  const loupGarouCount = Math.max(1, Math.floor(playerCount / 4));
  
  for (let i = 0; i < loupGarouCount; i++) {
    roles.push('LOUP_GAROU');
  }
  
  roles.push('VOYANTE');
  roles.push('CHASSEUR');
  
  while (roles.length < playerCount) {
    roles.push('VILLAGEOIS');
  }
  
  return roles.sort(() => Math.random() - 0.5);
}

// Décision de la victime
function decideVictim(votes) {
  const voteCount = {};
  Object.values(votes).forEach(id => {
    voteCount[id] = (voteCount[id] || 0) + 1;
  });
  
  const maxVotes = Math.max(...Object.values(voteCount));
  const victims = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes);
  return victims[Math.floor(Math.random() * victims.length)];
}

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log('✅ Nouveau joueur connecté:', socket.id);

  // Rejoindre une salle
  socket.on('join-room', ({ username, roomCode }) => {
    const room = roomCode || generateRoomCode();
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        phase: 'waiting',
        timer: null
      };
    }

    rooms[room].players.push({ id: socket.id, username });
    socket.emit('joined', { room });
    io.to(room).emit('players-update', rooms[room].players);

    console.log(`${username} a rejoint la salle ${room}`);
  });

  // Démarrer le jeu
  socket.on('start-game', (roomCode) => {
    if (rooms[roomCode] && rooms[roomCode].players.length >= 4) {
      const roles = assignRoles(rooms[roomCode].players.length);
      
      rooms[roomCode].players.forEach((player, index) => {
        player.role = roles[index];
        io.to(player.id).emit('role-assigned', { 
          role: ROLES[roles[index]] 
        });
      });
      
      io.to(roomCode).emit('game-started');
      startGamePhase(roomCode);
    }
  });

  // Gestion des votes des loups-garous
  socket.on('loup-vote', ({ roomCode, targetId }) => {
    if (!rooms[roomCode].votes) rooms[roomCode].votes = {};
    rooms[roomCode].votes[socket.id] = targetId;
    
    const loups = rooms[roomCode].players.filter(p => p.role === 'LOUP_GAROU');
    if (Object.keys(rooms[roomCode].votes).length === loups.length) {
      const victimId = decideVictim(rooms[roomCode].votes);
      io.to(roomCode).emit('player-killed', { victimId });
      rooms[roomCode].votes = {};
    }
  });

  // Action de la voyante
  socket.on('voyante-action', ({ roomCode, targetId }) => {
    const target = rooms[roomCode].players.find(p => p.id === targetId);
    if (target) {
      io.to(socket.id).emit('voyante-result', {
        player: target.username,
        role: ROLES[target.role].name
      });
    }
  });

  // Gestion des messages
  socket.on('send-message', ({ room, username, message }) => {
    const timestamp = new Date().toISOString();
    io.to(room).emit('receive-message', { username, message, timestamp });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log('❌ Déconnexion :', socket.id);
    for (const roomCode in rooms) {
      const index = rooms[roomCode].players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        rooms[roomCode].players.splice(index, 1);
        io.to(roomCode).emit('players-update', rooms[roomCode].players);
        break;
      }
    }
  });
});

// Gestion des phases de jeu
function startGamePhase(roomCode) {
  let isNight = true;
  
  rooms[roomCode].timer = setInterval(() => {
    io.to(roomCode).emit('phase-change', { 
      phase: isNight ? 'night' : 'day' 
    });
    
    if (!isNight) {
      rooms[roomCode].votes = {};
    }
    
    isNight = !isNight;
  }, 60000); // 1 minute par phase
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur http://localhost:${PORT}`);
});