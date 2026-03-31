import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const PRIMARY_BLUE = '#007BFF';
const API_BASE = process.env.REACT_APP_API_URL || 'https://ethio-books.onrender.com';

const ChatWindow = ({ otherUserId, otherUserName }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const roomIdRef = useRef('');

  useEffect(() => {
    if (!otherUserId) return;

    const storedUser = localStorage.getItem('ethioBooksUser');
    const storedToken = localStorage.getItem('ethioBooksToken');
    if (!storedUser || !storedToken) return;

    let currentUser;
    try {
      currentUser = JSON.parse(storedUser);
    } catch {
      return;
    }

    const currentUserId = (currentUser._id || currentUser.id || '').toString();
    if (!currentUserId) return;

    const roomId = [currentUserId, otherUserId.toString()].sort().join('_');
    roomIdRef.current = roomId;

    const socket = io(API_BASE, {
      auth: { token: storedToken }
    });

    socketRef.current = socket;

    socket.emit('joinRoom', roomId);

    socket.on('newMessage', (msg) => {
      if (msg.roomId === roomIdRef.current) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on('messageError', (msg) => {
      const errText = typeof msg === 'string' ? msg : msg?.message || 'Message failed';
      setError(errText);
      setTimeout(() => setError(''), 5000);
    });

    socket.on('connect_error', (err) => {
      setError(err.message || 'Socket connection failed');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [otherUserId]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current || !otherUserId) return;

    socketRef.current.emit('sendMessage', {
      roomId: roomIdRef.current,
      receiverId: otherUserId,
      text: trimmed
    });
    setText('');
  };

  let currentUser = null;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ethioBooksUser');
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
      } catch {
        currentUser = null;
      }
    }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksToken') : null;

  if (!currentUser || !token) {
    return (
      <div className="border border-gray-100 rounded-xl p-4 text-xs text-gray-500">
        Please log in to start chatting.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[280px] border border-gray-100 rounded-xl bg-white shadow-sm">
      <div
        className="px-4 py-2 border-b border-gray-100 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(0,123,255,0.03)' }}
      >
        <div>
          <p className="text-xs font-semibold text-gray-800">
            Chat with {otherUserName || 'User'}
          </p>
          <p className="text-[11px] text-gray-500">Messages may be monitored by admin.</p>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 text-[11px] text-red-700 bg-red-50 border-b border-red-100">{error}</div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs bg-gray-50 max-h-[320px]">
        {messages.length === 0 ? (
          <p className="text-[11px] text-gray-400">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
            const isMine =
              msg.sender?.id === (currentUser._id || currentUser.id)?.toString();
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-lg px-2 py-1.5 ${
                    isMine
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold mb-0.5">{msg.sender?.fullName || 'User'}</p>
                  )}
                  <p className="text-[11px]">{msg.text}</p>
                  <p className="text-[9px] opacity-70 mt-0.5 text-right">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-100 flex items-center space-x-2 bg-white">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message..."
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
        />
        <button
          type="button"
          onClick={handleSend}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm hover:shadow-md transition"
          style={{ backgroundColor: PRIMARY_BLUE }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
