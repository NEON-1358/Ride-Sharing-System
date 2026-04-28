import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getChatHistory } from '../utils/api';

const ChatBox = ({ bookingId, rideOwnerId, rideOwnerName, passengerId, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const scrollRef = useRef();

  // Normalize IDs for comparison
  const currentUserId = user?.publicId;
  const ownerId = rideOwnerId;
  const riderId = passengerId;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getChatHistory(bookingId);
        setMessages(history.map(m => ({
          text: m.text,
          from: m.senderId,
          fromName: m.senderName,
          ts: m.createdAt
        })));
      } catch (err) {
        console.error("Failed to load history", err);
      }
    };
    fetchHistory();

    const socketUrl = `${window.location.protocol}//${window.location.hostname}:3000/chat`;
    console.log("Connecting to socket:", socketUrl);
    const s = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log("Socket connected! ID:", s.id);
      console.log("Joining room:", bookingId);
      s.emit('join', bookingId);
    });

    s.on('connect_error', (err) => {
      console.error("Socket connection error:", err);
    });

    s.on('message', (msg) => {
      console.log("Received message:", msg);
      setMessages((prev) => [...prev, msg]);
    });

    setSocket(s);

    return () => s.disconnect();
  }, [bookingId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    // Determine the receiver ID
    const toId = currentUserId === ownerId ? riderId : ownerId;

    console.log("Sending message:", { room: bookingId, text: input, from: currentUserId, to: toId });
    socket.emit('message', {
      room: bookingId,
      text: input,
      from: currentUserId,
      fromName: user.name,
      to: toId
    });
    setInput('');
  };

  return (
    <div className="chat-overlay">
      <div className="chat-box">
        <div className="chat-header">
          <div>
            <h3 className="text-white">Chat with {currentUserId === ownerId ? 'Passenger' : rideOwnerName}</h3>
            <p className="text-xs opacity-75">Private Booking Chat</p>
          </div>
          <button className="close-chat" onClick={onClose}>&times;</button>
        </div>
        
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="text-center py-10 opacity-50 text-sm">
              No messages yet. Say hello!
            </div>
          )}
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`msg ${msg.from === currentUserId ? 'msg-sent' : 'msg-received'}`}
            >
              <div className="text-[10px] opacity-70 mb-1">{msg.fromName}</div>
              {msg.text}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <button 
            type="submit"
            className="solid-button !py-2 !px-4"
            disabled={!input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
