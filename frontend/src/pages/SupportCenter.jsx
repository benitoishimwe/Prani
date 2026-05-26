import React, { useState, useEffect } from 'react';
import { MessageCircle, TicketIcon, ChevronRight, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const STATUS_BADGES = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-gray-100 text-gray-500',
};

const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

function TicketCard({ ticket, onClick }) {
  return (
    <button
      onClick={() => onClick(ticket)}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-[#0F4C5C]/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm truncate">{ticket.subject}</p>
          <p className="text-gray-500 text-xs mt-1 truncate">{ticket.message}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[ticket.status]}`}>
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="text-gray-400 text-xs">
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      {ticket._count?.supportMessages > 0 && (
        <p className="text-xs text-gray-400 mt-2">{ticket._count.supportMessages} message(s)</p>
      )}
    </button>
  );
}

function TicketDetail({ ticket, onBack }) {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/support/tickets/${ticket.ticketId}/messages`)
      .then(({ data }) => setMessages(data || []))
      .catch(() => {});
  }, [ticket.ticketId]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/support/tickets/${ticket.ticketId}/reply`, { message: reply });
      setMessages((m) => [...m, data]);
      setReply('');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        ← Back to tickets
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-start justify-between">
          <h2 className="font-semibold text-gray-800">{ticket.subject}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[ticket.status]}`}>
            {STATUS_LABELS[ticket.status]}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-2">{ticket.message}</p>
        <p className="text-gray-400 text-xs mt-2">
          Ticket #{ticket.ticketId.substring(0, 8).toUpperCase()} · {new Date(ticket.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No replies yet. Our team will respond soon.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.messageId} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
              msg.senderType === 'user' ? 'bg-[#0F4C5C] text-white' : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-xs opacity-60 mb-1 font-medium">
                {msg.senderType === 'support' ? 'Support Team' : 'You'}
              </p>
              {msg.message}
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
        <form onSubmit={sendReply} className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Add a reply..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
          />
          <button
            type="submit"
            disabled={!reply.trim() || sending}
            className="bg-[#0F4C5C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3340] disabled:opacity-60"
          >
            {sending ? '...' : 'Reply'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SupportCenter() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'create'

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const { data } = await api.get('/support/tickets/mine');
      setTickets(data || []);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }

  async function createTicket(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/support/ticket', newTicket);
      toast.success('Ticket created! We will respond to your email.');
      setNewTicket({ subject: '', message: '' });
      setView('list');
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  }

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <TicketDetail ticket={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-500 text-sm mt-1">View your tickets and get help</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTickets} className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView(view === 'create' ? 'list' : 'create')}
            className="bg-[#0F4C5C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3340]"
          >
            {view === 'create' ? 'View tickets' : '+ New ticket'}
          </button>
        </div>
      </div>

      {view === 'create' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Create Support Ticket</h2>
          <form onSubmit={createTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={newTicket.subject}
                onChange={(e) => setNewTicket((t) => ({ ...t, subject: e.target.value }))}
                placeholder="Briefly describe your issue"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea
                required
                rows={5}
                value={newTicket.message}
                onChange={(e) => setNewTicket((t) => ({ ...t, message: e.target.value }))}
                placeholder="Describe your issue in detail..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-[#0F4C5C] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#0a3340] disabled:opacity-60"
              >
                {creating ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TicketIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No support tickets yet</p>
              <p className="text-gray-400 text-sm mt-1">Create a ticket if you need help</p>
            </div>
          ) : (
            tickets.map((t) => (
              <TicketCard key={t.ticketId} ticket={t} onClick={setSelected} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
