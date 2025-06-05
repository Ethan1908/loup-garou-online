import { useState, useEffect } from 'react';
import socket from './socket';
import './App.css';

export default function App() {
  // États du jeu
  const [player, setPlayer] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [role, setRole] = useState(null);
  const [phase, setPhase] = useState('waiting');
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [notification, setNotification] = useState(null);
  const [roleComposition, setRoleComposition] = useState({
    LOUP_GAROU: 1,
    VOYANTE: 1,
    CHASSEUR: 1,
    VILLAGEOIS: 1
  });

  // Gestion des événements Socket.io
  useEffect(() => {
    const handlers = {
      'joined': ({ room }) => setRoom(room),
      'players-update': (players) => setPlayers(players),
      'receive-message': ({ username, message, timestamp }) => {
        setMessages(prev => [...prev, { username, message, timestamp }]);
      },
      'role-assigned': ({ role }) => {
        setRole(role);
        setNotification(`Vous êtes ${role.name}!`);
      },
      'game-started': () => setGameStarted(true),
      'phase-change': ({ phase }) => {
        setPhase(phase);
        setTimeLeft(60);
        setNotification(`Phase ${phase === 'night' ? 'nuit' : 'jour'} commence!`);
      },
      'player-killed': ({ victimId }) => {
        setPlayers(prev => prev.filter(p => p.id !== victimId));
      },
      'voyante-result': ({ player, role }) => {
        setNotification(`${player} est ${role}`);
      },
      'error': (err) => setNotification(`Erreur: ${err.message}`)
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, []);

  // Timer des phases
  useEffect(() => {
    if (!gameStarted || (phase !== 'night' && phase !== 'day')) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 60 : prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, gameStarted]);

  // Gestion des notifications
  useEffect(() => {
    const timer = notification && setTimeout(() => setNotification(null), 3000);
    return () => timer && clearTimeout(timer);
  }, [notification]);

  // Rejoindre une salle
  const handleJoin = ({ username, roomCode }) => {
    setPlayer({ username, id: socket.id });
    socket.emit('join-room', { username, roomCode });
  };

  // Envoyer un message
  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    socket.emit('send-message', {
      room,
      username: player.username,
      message: newMessage,
    });
    setNewMessage('');
  };

  // Démarrer le jeu
  const handleStartGame = () => {
    const totalAssigned = Object.values(roleComposition).reduce((a, b) => a + b, 0);
    const finalComposition = {
      ...roleComposition,
      VILLAGEOIS: roleComposition.VILLAGEOIS + (players.length - totalAssigned)
    };

    socket.emit('start-game', { 
      roomCode: room, 
      roleComposition: finalComposition 
    });
  };

  // Vote loup-garou
  const handleLoupVote = (targetId) => {
    socket.emit('loup-vote', { roomCode: room, targetId });
  };

  // Action voyante
  const handleVoyanteAction = (targetId) => {
    socket.emit('voyante-action', { roomCode: room, targetId });
  };

  return (
    <div className="app-container">
      <h1 className="game-title">Loup-Garou Online</h1>

      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}

      {!player ? (
        <JoinForm onJoin={handleJoin} />
      ) : (
        <div className="game-container">
          <div>
            <h2 className="section-title">
              Salle : <span className="room-info">{room}</span>
            </h2>
            <h3 className="section-title">Joueurs ({players.length}) :</h3>
            <ul className="players-list">
              {players.map((p) => (
                <li key={p.id}>
                  {p.username}
                  {gameStarted && p.role?.team === 'loups' && role?.team === 'loups' && (
                    <span className="player-loup"> (Loup)</span>
                  )}
                </li>
              ))}
            </ul>

            {!gameStarted && players[0]?.id === socket.id && (
              <div className="start-section">
                <RoleSelection
                  players={players}
                  composition={roleComposition}
                  onChange={setRoleComposition}
                />
                <button
                  onClick={handleStartGame}
                  className="start-button"
                  disabled={players.length < 4}
                >
                  Commencer la partie ({players.length}/8)
                </button>
              </div>
            )}
          </div>

          {gameStarted && (
            <div className="game-phase">
              <h3>
                Phase: {phase === 'night' ? 'Nuit' : 'Jour'} 
                <span className="phase-timer"> - {timeLeft}s</span>
              </h3>
              {role && (
                <div className="role-info">
                  <h4>Votre rôle: {role.name}</h4>
                  <p>{getRoleDescription(role.name)}</p>
                  {role.team === 'loups' && phase === 'day' && (
                    <p className="warning">⚠️ Faites semblant d'être un villageois !</p>
                  )}
                </div>
              )}
              {phase === 'night' && role?.nightAction && (
                <NightActions 
                  role={role} 
                  players={players} 
                  onAction={role.name === 'Loup-Garou' ? handleLoupVote : handleVoyanteAction} 
                />
              )}
            </div>
          )}

          <div>
            <h3 className="section-title">Chat</h3>
            <div className="chat-container">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <strong>{msg.username}:</strong> {msg.message}
                  <span className="message-time">
                    ({new Date(msg.timestamp).toLocaleTimeString()})
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSend} className="message-form">
              <input
                type="text"
                placeholder="Tape ton message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="message-input"
              />
              <button type="submit" className="send-button">
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function JoinForm({ onJoin }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return alert('Entre ton pseudo !');
    onJoin({ username, roomCode });
  };

  return (
    <form onSubmit={handleSubmit} className="join-form">
      <input
        type="text"
        placeholder="Ton pseudo"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="form-input"
        required
      />
      <input
        type="text"
        placeholder="Code de salle (optionnel)"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        className="form-input"
      />
      <button type="submit" className="submit-button">
        Rejoindre la partie
      </button>
    </form>
  );
}

function NightActions({ role, players, onAction }) {
  const [selectedPlayer, setSelectedPlayer] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedPlayer && onAction) {
      onAction(selectedPlayer);
      setSelectedPlayer('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="night-actions">
      <h4>Action de nuit ({role.name})</h4>
      <select 
        value={selectedPlayer}
        onChange={(e) => setSelectedPlayer(e.target.value)}
        className="action-select"
        required
      >
        <option value="">Choisir un joueur</option>
        {players
          .filter(p => 
            role.name === 'Loup-Garou' 
              ? p.role?.team !== 'loups' && p.id !== socket.id
              : p.id !== socket.id
          )
          .map(p => (
            <option key={p.id} value={p.id}>{p.username}</option>
          ))}
      </select>
      <button type="submit" className="action-button">
        Valider
      </button>
    </form>
  );
}

function RoleSelection({ players, composition, onChange }) {
  const remaining = players.length - Object.values(composition).reduce((a, b) => a + b, 0);

  const handleChange = (role, value) => {
    const newValue = Math.max(0, Math.min(players.length, parseInt(value) || 0));
    onChange({
      ...composition,
      [role]: newValue
    });
  };

  return (
    <div className="role-selection">
      <h4>Composition des rôles</h4>
      <div className="role-inputs">
        <div className="role-input">
          <label>Loups-Garous:</label>
          <input
            type="number"
            min="1"
            value={composition.LOUP_GAROU}
            onChange={(e) => handleChange('LOUP_GAROU', e.target.value)}
          />
        </div>
        <div className="role-input">
          <label>Voyante:</label>
          <input
            type="number"
            min="0"
            value={composition.VOYANTE}
            onChange={(e) => handleChange('VOYANTE', e.target.value)}
          />
        </div>
        <div className="role-input">
          <label>Chasseur:</label>
          <input
            type="number"
            min="0"
            value={composition.CHASSEUR}
            onChange={(e) => handleChange('CHASSEUR', e.target.value)}
          />
        </div>
        <div className="role-input">
          <label>Villageois:</label>
          <span>{composition.VILLAGEOIS + remaining}</span>
        </div>
      </div>
      {remaining !== 0 && (
        <p className="composition-warning">
          {remaining > 0 
            ? `Il reste ${remaining} rôle(s) à attribuer`
            : `Vous avez ${-remaining} rôle(s) en trop`}
        </p>
      )}
    </div>
  );
}

function getRoleDescription(roleName) {
  const descriptions = {
    'Villageois': 'Vous devez trouver et éliminer les Loups-Garous.',
    'Loup-Garou': 'Dévorer un villageois chaque nuit. Le jour, faites semblant d\'être innocent!',
    'Voyante': 'Chaque nuit, découvrez le vrai rôle d\'un joueur.',
    'Chasseur': 'Si vous mourez, vous pouvez emporter quelqu\'un avec vous.'
  };
  return descriptions[roleName] || '';
}