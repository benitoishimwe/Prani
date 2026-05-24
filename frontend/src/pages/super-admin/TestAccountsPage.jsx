import React, { useState, useEffect, useCallback } from 'react';
import { superAdminAPI } from '../../services/api';
import { toast } from 'sonner';
import {
  FlaskConical, Plus, Trash2, Copy, RefreshCw, Mail,
  Calendar, Building2, User, Shield, X, Check,
} from 'lucide-react';

const PLANS = ['free', 'pro', 'max', 'wedding', 'enterprise'];
const PLAN_COLORS = {
  free: 'bg-[#F3F4F6] text-[#374151]',
  trial: 'bg-[#E0F2FE] text-[#0369A1]',
  pro: 'bg-[#FEF3C7] text-[#B45309]',
  max: 'bg-[#DCFCE7] text-[#166534]',
  wedding: 'bg-[#FCE7F3] text-[#9D174D]',
  enterprise: 'bg-[#EDE9FE] text-[#5B21B6]',
};

function timeUntil(dateStr) {
  const diff = new Date(dateStr) - Date.now();
  if (diff <= 0) return 'Expired';
  const d = Math.floor(diff / 86400000);
  if (d > 1) return `${d} days left`;
  const h = Math.floor(diff / 3600000);
  return `${h}h left`;
}

export default function TestAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [copied,   setCopied]   = useState(null);

  // Form state
  const [form, setForm] = useState({
    email: '',
    name: '',
    plan: 'pro',
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: '',
    tenantId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null); // { email, tempPassword }

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminAPI.listTestAccounts();
      const data = res.data?.testAccounts || res.data || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load test accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) return toast.error('Email is required');
    setSubmitting(true);
    try {
      const payload = {
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        plan: form.plan,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
        tenantId: form.tenantId.trim() || undefined,
      };
      const res = await superAdminAPI.createTestAccount(payload);
      const result = res.data?.data || res.data;
      setCreatedCreds({ email: result.user?.email, tempPassword: result.tempPassword });
      toast.success('Test account created successfully');
      setShowForm(false);
      setForm({ email: '', name: '', plan: 'pro', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], notes: '', tenantId: '' });
      await loadAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create test account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this test account?')) return;
    setDeleting(id);
    try {
      await superAdminAPI.deleteTestAccount(id);
      toast.success('Test account deactivated');
      setAccounts(prev => prev.filter(a => a.testAccountId !== id));
    } catch {
      toast.error('Failed to deactivate');
    } finally {
      setDeleting(null);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center">
              <FlaskConical size={20} className="text-[#0F4C5C]" />
            </div>
            <h1 className="text-2xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>Test Accounts</h1>
          </div>
          <p className="text-sm text-[#6B7280]">Create time-limited test accounts for demos, QA, and potential clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAccounts} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280]">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setShowForm(true); setCreatedCreds(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] text-white rounded-xl text-sm font-semibold hover:bg-[#0A3545] transition-colors"
          >
            <Plus size={16} /> New Test Account
          </button>
        </div>
      </div>

      {/* Credential display after creation */}
      {createdCreds && (
        <div className="bg-[#ECFDF5] border border-[#BBF7D0] rounded-xl p-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#065F46] mb-2 flex items-center gap-1.5">
              <Check size={16} /> Test account created — copy credentials now
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-[#374151]">
                <Mail size={14} className="text-[#6B7280]" />
                <span className="font-mono">{createdCreds.email}</span>
                <button onClick={() => copyToClipboard(createdCreds.email, 'email')} className="p-1 rounded hover:bg-[#D1FAE5]">
                  {copied === 'email' ? <Check size={12} className="text-[#059669]" /> : <Copy size={12} className="text-[#6B7280]" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#374151]">
                <Shield size={14} className="text-[#6B7280]" />
                <span className="font-mono font-bold">{createdCreds.tempPassword}</span>
                <button onClick={() => copyToClipboard(createdCreds.tempPassword, 'pw')} className="p-1 rounded hover:bg-[#D1FAE5]">
                  {copied === 'pw' ? <Check size={12} className="text-[#059669]" /> : <Copy size={12} className="text-[#6B7280]" />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setCreatedCreds(null)} className="p-1 rounded hover:bg-[#D1FAE5] text-[#6B7280]">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[#111827]">Create Test Account</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[#F3F4F6]">
              <X size={18} className="text-[#6B7280]" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#374151] mb-1">Email *</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="tester@example.com"
                className="input-wedding w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Name</label>
              <input
                type="text" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Jane Smith"
                className="input-wedding w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                className="input-wedding w-full capitalize"
              >
                {PLANS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Expires</label>
              <input
                type="date" value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="input-wedding w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Tenant ID <span className="text-[#9CA3AF] font-normal">(optional — creates new if blank)</span></label>
              <input
                type="text" value={form.tenantId}
                onChange={e => setForm(p => ({ ...p, tenantId: e.target.value }))}
                placeholder="UUID of existing tenant"
                className="input-wedding w-full font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#374151] mb-1">Notes</label>
              <input
                type="text" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Purpose of this test account..."
                className="input-wedding w-full"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F9FAFB]">
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="px-5 py-2 bg-[#0F4C5C] text-white rounded-xl text-sm font-semibold hover:bg-[#0A3545] disabled:opacity-60 flex items-center gap-2"
              >
                {submitting ? <><RefreshCw size={14} className="animate-spin" /> Creating…</> : <><FlaskConical size={14} /> Create Account</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl skeleton" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="empty-state py-20">
          <div className="empty-state-icon"><FlaskConical size={28} className="text-[#0F4C5C]" /></div>
          <p className="font-semibold text-[#374151] mt-2">No test accounts yet</p>
          <p className="text-sm text-[#6B7280] mt-1">Create one to give external users access for demos or QA.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-[#374151] text-xs uppercase tracking-wide">Account</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-[#374151] text-xs uppercase tracking-wide">Tenant</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-[#374151] text-xs uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-[#374151] text-xs uppercase tracking-wide">Expires</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-[#374151] text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {accounts.map(acc => {
                  const expired = new Date(acc.expiresAt) < new Date();
                  return (
                    <tr key={acc.testAccountId} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0F4C5C]/10 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-[#0F4C5C]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#111827]">{acc.user?.name || acc.email}</p>
                            <p className="text-xs text-[#9CA3AF]">{acc.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[#374151]">
                          <Building2 size={13} className="text-[#9CA3AF]" />
                          {acc.tenant?.name || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[acc.plan] || 'bg-[#F3F4F6] text-[#374151]'}`}>
                          {acc.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[#374151]">
                          <Calendar size={13} className="text-[#9CA3AF]" />
                          <span className="text-xs">{new Date(acc.expiresAt).toLocaleDateString()}</span>
                        </div>
                        <p className={`text-[11px] mt-0.5 ${expired ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>
                          {timeUntil(acc.expiresAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          !acc.isActive || expired ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#166534]'
                        }`}>
                          {!acc.isActive ? 'Deactivated' : expired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {acc.isActive && (
                          <button
                            onClick={() => handleDelete(acc.testAccountId)}
                            disabled={deleting === acc.testAccountId}
                            className="p-1.5 rounded-lg hover:bg-[#FEE2E2] text-[#9CA3AF] hover:text-[#DC2626] transition-colors disabled:opacity-50"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
