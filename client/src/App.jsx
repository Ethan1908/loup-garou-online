import { useState, useEffect } from 'react';
import socket from './socket';

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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-yellow-400 mb-6">Loup-Garou Online</h1>

      {!player ? (
        <JoinForm onJoin={handleJoin} />
      ) : (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md space-y-6">
          <div>
            <h2 className="text-yellow-400 font-semibold mb-2">
              Salle : <span className="text-white">{room}</span>
            </h2>
            <h3 className="text-yellow-400 font-semibold mb-2">Joueurs :</h3>
            <ul className="text-white list-disc list-inside max-h-32 overflow-y-auto">
              {players.map((p) => (
                <li key={p.id}>{p.username}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-yellow-400 font-semibold mb-2">Chat</h3>
            <div className="bg-gray-700 p-3 rounded max-h-40 overflow-y-auto text-white text-sm mb-2">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <strong>{msg.username}:</strong> {msg.message}
                  <span className="text-xs text-gray-400 ml-2">
                    ({new Date(msg.timestamp).toLocaleTimeString()})
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSend} className="flex space-x-2">
              <input
                type="text"
                placeholder="Tape ton message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow px-3 py-2 rounded border border-gray-600 bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="submit"
                className="bg-yellow-400 text-gray-900 font-semibold px-4 rounded hover:bg-yellow-500 transition"
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
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm">
      <input
        type="text"
        placeholder="Ton pseudo"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
      <input
        type="text"
        placeholder="Code de salle (optionnel)"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        className="w-full mb-6 px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
      <button
        type="submit"
        className="w-full bg-yellow-400 text-gray-900 font-semibold py-2 rounded hover:bg-yellow-500 transition"
      >
        Rejoindre la partie
      </button>
    </form>
  );
}
