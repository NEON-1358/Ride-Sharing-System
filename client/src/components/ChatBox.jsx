import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getChatHistory, SOCKET_BASE } from '../utils/api';

const ChatBox = ({ bookingId, rideOwnerId, rideOwnerName, passengerId, onClose }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(null);
  const scrollRef = useRef();
  const typingTimeoutRef = useRef(null);

  // Normalize IDs for comparison
  const currentUserId = user?.id;
  const ownerId = rideOwnerId;
  const riderId = passengerId;

  useEffect(() => {
    if (!token || !bookingId) return;

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

    const socketUrl = `${SOCKET_BASE}/chat`;
    console.log("Connecting to socket:", socketUrl);
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: token
      }
    });

    s.on('connect', () => {
      console.log("SUCCESS: Socket connected! ID:", s.id);
      console.log("ACTION: Joining room:", bookingId);
      console.log("DEBUG IDs:", { currentUserId, ownerId, riderId });
      s.emit('join', bookingId);
    });

    s.on('joined', (data) => {
      console.log("SUCCESS: Joined room successfully:", data);
    });

    s.on('user_joined', (data) => {
      console.log("INFO: Another user joined the room:", data);
    });

    s.on('connect_error', (err) => {
      console.error("ERROR: Socket connection error:", err.message);
    });

    s.on('error', (err) => {
      console.error("ERROR: Socket error:", err);
    });

    s.on('message', (msg) => {
      console.log("SUCCESS: Received message:", msg);
      setMessages((prev) => [...prev, msg]);
      setPartnerTyping(null); // Clear typing status when message arrives
    });

    s.on('typing', (data) => {
      if (String(data.from) !== String(currentUserId)) {
        setPartnerTyping(data.fromName);
      }
    });

    s.on('stop_typing', (data) => {
      if (String(data.from) !== String(currentUserId)) {
        setPartnerTyping(null);
      }
    });

    setSocket(s);

    return () => s.disconnect();
  }, [bookingId, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    if (!socket) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { room: bookingId, from: currentUserId, fromName: user.name });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop_typing', { room: bookingId, from: currentUserId });
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    // Clear typing indicator immediately
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', { room: bookingId, from: currentUserId });

    // Determine the receiver ID
    // CRITICAL FIX: Ensure we use the correct ID format for comparison
    const curIdStr = String(currentUserId);
    const ownerIdStr = String(ownerId);
    const riderIdStr = String(riderId);
    
    const toId = curIdStr === ownerIdStr ? riderIdStr : ownerIdStr;

    console.log("SENDING DEBUG:", {
      currentUserId: curIdStr,
      ownerId: ownerIdStr,
      riderId: riderIdStr,
      toId,
      room: bookingId,
      text: input
    });

    if (!toId) {
      console.error("Cannot send message: Receiver ID (toId) is missing");
      return;
    }

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

  const isDriver = String(currentUserId) === String(ownerId);
  const chatPartnerName = isDriver ? "Passenger" : (rideOwnerName || "Driver");

  return (
    <div className="chat-overlay">
      <div className="chat-box">
        <div className="chat-header">
          <div>
            <h3>Chat with {chatPartnerName}</h3>
            <p className="chat-meta">Private booking chat</p>
          </div>
          <button className="close-chat" onClick={onClose} type="button" aria-label="Close chat">&times;</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              No messages yet. Say hello!
            </div>
          )}
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`msg ${String(msg.from) === String(currentUserId) ? 'msg-sent' : 'msg-received'}`}
            >
              <div className="chat-message-author">{msg.fromName}</div>
              <div>{msg.text}</div>
            </div>
          ))}
          {partnerTyping && (
            <div className="typing-block">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <div className="typing-label">{partnerTyping} is typing...</div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Write a message..."
            className="chat-input"
          />
          <button 
            type="submit"
            className="solid-button chat-send"
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
