// src/components/Lobby.jsx
import { useState } from 'react';

export default function Lobby({ onJoin }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() === '') return;
    onJoin({ username, roomCode });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">🧛‍♂️ Loup-Garou en Ligne</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Ton pseudo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="p-2 rounded text-black"
        />
        <input
          type="text"
          placeholder="Code de partie (optionnel)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          className="p-2 rounded text-black"
        />
        <button type="submit" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
          Rejoindre / Créer
        </button>
      </form>
    </div>
  );
}