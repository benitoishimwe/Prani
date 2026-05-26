import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, Filter } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

const STATUS_BADGES = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-gray-100 text-gray-500',
};

const PRIORITY_BADGES = {
  low:    'bg-gray-100 text-gray-500',
  normal: 'bg-blue-50 text-blue-600',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

function TicketRow({ ticket, onClick }) {
  return (
    <tr
      onClick={() => onClick(ticket)}
      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{ticket.ticketId.substring(0, 8).toUpperCase()}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{ticket.subject}</p>
        <p className="text-xs text-gray-500 truncate max-w-xs">{ticket.email}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[ticket.status]}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGES[ticket.priority]}`}>
          {ticket.priority}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{ticket._count?.supportMessages ?? 0}</td>
    </tr>
  );
}

function TicketModal({ ticket: initial, onClose, onUpdate }) {
  const [ticket, setTicket] = useState(initial);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState(initial.status);
  const [resolution, setResolution] = useState(initial.resolution || '');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/support/tickets/${ticket.ticketId}/messages`)
      .then(({ data }) => setMessages(data || []))
      .catch(() => {});
  }, [ticket.ticketId]);

  async function saveStatus() {
    setSaving(true);
    try {
      const { data } = await api.patch(`/support/tickets/${ticket.ticketId}/status`, {
        status,
        resolution: resolution || undefined,
      });
      setTicket(data);
      onUpdate(data);
      toast.success('Ticket updated');
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/support/tickets/${ticket.ticketId}/reply`, { message: reply });
      setMessages((m) => [...m, data]);
      setReply('');
      toast.success('Reply sent');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{ticket.subject}</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              From: {ticket.email} · #{ticket.ticketId.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Original message */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Original message</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Status controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={saveStatus}
                disabled={saving}
                className="w-full bg-[#0F4C5C] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#0a3340] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Update status'}
              </button>
            </div>
          </div>

          {(status === 'resolved' || status === 'closed') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Resolution note</label>
              <textarea
                rows={2}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the resolution..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] resize-none"
              />
            </div>
          )}

          {/* Conversation */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Conversation</p>
            {messages.length === 0 ? (
              <p className="text-gray-400 text-sm">No replies yet.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.messageId} className={`flex ${msg.senderType === 'support' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                      msg.senderType === 'support' ? 'bg-[#0F4C5C] text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-xs opacity-60 mb-1">{msg.senderType === 'support' ? 'You (Support)' : 'Customer'}</p>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reply box */}
        {ticket.status !== 'closed' && (
          <form onSubmit={sendReply} className="px-6 py-4 border-t border-gray-200 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply to customer..."
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
    </div>
  );
}

export default function SupportDashboard() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/support/tickets', {
        params: { status: filterStatus || undefined, priority: filterPriority || undefined, page, size: 20 },
      });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, page]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  function handleUpdate(updated) {
    setTickets((ts) => ts.map((t) => (t.ticketId === updated.ticketId ? { ...t, ...updated } : t)));
  }

  const stats = {
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total tickets</p>
        </div>
        <button onClick={fetchTickets} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Open', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-600 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
        >
          <option value="">All priorities</option>
          {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Subject / Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Replies</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No tickets found</td></tr>
            ) : (
              tickets.map((t) => <TicketRow key={t.ticketId} ticket={t} onClick={setSelected} />)
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40">Prev</button>
              <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <TicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
