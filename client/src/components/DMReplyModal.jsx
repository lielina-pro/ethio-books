import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { X, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PRIMARY_BLUE = '#007BFF';

const DMReplyModal = ({ isOpen, onClose, student, tutorId }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksToken') : null;
  const api = useMemo(() => {
    return axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [token]);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && student?._id) {
      fetchConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student?._id]);

  const fetchConversation = async () => {
    if (!student?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`/messages/${student._id}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching messages:', error?.response?.data || error);
      toast.error('Failed to load conversation');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !student?._id) return;

    setSending(true);
    try {
      await api.post('/messages', {
        receiverId: student._id,
        content: newMessage
      });

      setNewMessage('');
      toast.success('Message sent');
      await fetchConversation();
    } catch (error) {
      console.error('Error sending message:', error?.response?.data || error);
      toast.error(error?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col border border-gray-100 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h3 className="font-extrabold text-gray-900">Chat with {student?.fullName}</h3>
            <p className="text-xs text-gray-500">{student?.isPremium ? 'Premium Student' : 'Free Student'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No messages yet. Start a conversation!</div>
          ) : (
            messages.map((msg) => (
              <div key={msg._id} className={`flex ${msg.senderId === tutorId ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] p-3 rounded-xl ${
                    msg.senderId === tutorId ? 'text-white' : 'bg-white text-gray-800 border border-gray-100'
                  }`}
                  style={msg.senderId === tutorId ? { backgroundColor: PRIMARY_BLUE } : undefined}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 p-4 flex gap-2 bg-white">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your reply..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-2 font-extrabold text-sm"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default DMReplyModal;

