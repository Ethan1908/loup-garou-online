import { useState, useEffect } from 'react';
import socket from './socket';
import './App.css'; // Import du fichier CSS

export default function App() {
  const [player, setPlayer] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    socket.on('joined', ({ room }) => setRoom(room));
    socket.on('players-update', (players) => setPlayers(players));
    socket.on('receive-message', ({ username, message, timestamp }) => {
      setMessages((prev) => [...prev, { username, message, timestamp }]);
    });

    return () => {
      socket.off('joined');
      socket.off('players-update');
      socket.off('receive-message');
    };
  }, []);

  const handleJoin = ({ username, roomCode }) => {
    setPlayer({ username });
    socket.emit('join-room', { username, roomCode });
  };

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

  return (
    <div className="app-container">
      <h1 className="game-title">Loup-Garou Online</h1>

      {!player ? (
        <JoinForm onJoin={handleJoin} />
      ) : (
        <div className="game-container">
          <div>
            <h2 className="section-title">
              Salle : <span className="room-info">{room}</span>
            </h2>
            <h3 className="section-title">Joueurs :</h3>
            <ul className="players-list">
              {players.map((p) => (
                <li key={p.id}>{p.username}</li>
              ))}
            </ul>
          </div>

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
              <button
                type="submit"
                className="send-button"
              >
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
      />
      <input
        type="text"
        placeholder="Code de salle (optionnel)"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        className="form-input"
      />
      <button
        type="submit"
        className="submit-button"
      >
        Rejoindre la partie
      </button>
    </form>
  );
}