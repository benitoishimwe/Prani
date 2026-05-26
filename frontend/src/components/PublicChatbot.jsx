import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

function getOrCreateSessionToken() {
  const key = 'plani_chat_session';
  let token = localStorage.getItem(key);
  if (!token) {
    token = 'pub_' + (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(key, token);
  }
  return token;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-2xl rounded-tl-none w-16">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export default function PublicChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('chat');
  const [sessionToken] = useState(getOrCreateSessionToken);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the Plani assistant. Ask me anything about our platform, pricing, or features!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState({ email: '', subject: '', message: '' });
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/public/support/chat`, {
        message: text,
        sessionToken,
      });

      setMessages((m) => [...m, { role: 'assistant', content: data.data?.response || data.response }]);

      const result = data.data || data;
      if (result.shouldEscalate || result.escalatedTicketId) {
        setMessages((m) => [...m, {
          role: 'system',
          content: `Your issue has been escalated to our support team${result.escalatedTicketId ? ` (Ticket #${result.escalatedTicketId.substring(0, 8).toUpperCase()})` : ''}. We'll reach out shortly!`,
        }]);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setMessages((m) => [...m, { role: 'assistant', content: 'You\'ve sent too many messages. Please try again in an hour or create a support ticket.' }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again or create a support ticket.' }]);
      }
    } finally {
      setLoading(false);
      if (!isOpen) setUnreadCount((n) => n + 1);
    }
  }

  async function submitTicket(e) {
    e.preventDefault();
    if (!ticket.email.trim() || !ticket.subject.trim() || !ticket.message.trim()) return;
    setTicketLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/public/support/ticket`, {
        email: ticket.email,
        subject: ticket.subject,
        message: ticket.message,
      });
      setTicketSent(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket. Please try again.');
    } finally {
      setTicketLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#0F4C5C] text-white rounded-full shadow-xl hover:bg-[#0a3340] flex items-center justify-center transition-all hover:scale-105"
        aria-label="Chat with Plani support"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E67E22] rounded-full text-xs flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="bg-[#0F4C5C] text-white px-4 py-3 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Plani Support</p>
                <p className="text-white/70 text-xs">Ask us anything · Typically instant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setView('chat')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${view === 'chat' ? 'text-[#0F4C5C] border-b-2 border-[#0F4C5C]' : 'text-gray-500'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setView('ticket')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${view === 'ticket' ? 'text-[#0F4C5C] border-b-2 border-[#0F4C5C]' : 'text-gray-500'}`}
            >
              Contact Us
            </button>
          </div>

          {/* Chat view */}
          {view === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'system' ? (
                      <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex gap-2">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-[#0F4C5C] text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <TypingIndicator />
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setView('ticket')}
                  className="w-full text-xs text-gray-400 hover:text-[#0F4C5C] mb-2 flex items-center justify-center gap-1 transition-colors"
                >
                  <AlertCircle className="w-3 h-3" /> Need human support? Contact us
                </button>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
                    placeholder="Ask about pricing, features..."
                    disabled={loading}
                    className="flex-1 border border-gray-300 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="w-9 h-9 bg-[#0F4C5C] text-white rounded-full flex items-center justify-center hover:bg-[#0a3340] disabled:opacity-50 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Ticket / contact view */}
          {view === 'ticket' && (
            <div className="flex-1 overflow-y-auto p-4">
              {ticketSent ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Message sent!</h3>
                  <p className="text-gray-500 text-sm">Our team will respond to your email within 24 hours.</p>
                  <button
                    onClick={() => { setView('chat'); setTicketSent(false); setTicket({ email: '', subject: '', message: '' }); }}
                    className="text-[#0F4C5C] text-sm hover:underline"
                  >
                    Back to chat
                  </button>
                </div>
              ) : (
                <form onSubmit={submitTicket} className="space-y-3">
                  <h3 className="font-semibold text-gray-800 text-sm">Contact Plani Support</h3>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Your email *</label>
                    <input
                      type="email"
                      required
                      value={ticket.email}
                      onChange={(e) => setTicket((t) => ({ ...t, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                    <input
                      type="text"
                      required
                      value={ticket.subject}
                      onChange={(e) => setTicket((t) => ({ ...t, subject: e.target.value }))}
                      placeholder="e.g. Question about pricing"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Message *</label>
                    <textarea
                      required
                      rows={3}
                      value={ticket.message}
                      onChange={(e) => setTicket((t) => ({ ...t, message: e.target.value }))}
                      placeholder="How can we help you?"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketLoading}
                    className="w-full bg-[#0F4C5C] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[#0a3340] disabled:opacity-60 transition-colors"
                  >
                    {ticketLoading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
