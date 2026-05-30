import React, { useState, useEffect } from 'react';
import { plannerAPI, eventsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Loader2, Plus, LayoutDashboard, DollarSign, Users, MapPin, Palette, UtensilsCrossed, Calendar, ChevronRight } from 'lucide-react';
import OverviewTab from './planner/OverviewTab';
import BudgetTab from './planner/BudgetTab';
import GuestsTab from './planner/GuestsTab';
import VenuesTab from './planner/VenuesTab';
import ThemeTab from './planner/ThemeTab';
import MenuTab from './planner/MenuTab';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'budget',   label: 'Budget',   icon: DollarSign },
  { key: 'guests',   label: 'Guests',   icon: Users },
  { key: 'venues',   label: 'Venues',   icon: MapPin },
  { key: 'theme',    label: 'Theme',    icon: Palette },
  { key: 'menu',     label: 'Menu',     icon: UtensilsCrossed },
];

const THEMES = ['Modern', 'Rustic', 'Beach', 'Garden', 'Traditional', 'Elegant', 'Bohemian', 'Minimalist'];

export default function PlannerPage() {
  const { isClient } = useAuth();
  const [plan, setPlan]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab]           = useState('overview');
  const [events, setEvents]     = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [form, setForm] = useState({ wedding_date: '', theme: 'Modern', total_budget: '' });

  useEffect(() => {
    const load = async () => {
      const [planRes, evRes] = await Promise.allSettled([
        plannerAPI.getCurrent(),
        eventsAPI.list({ limit: 20 }),
      ]);
      if (planRes.status === 'fulfilled') setPlan(planRes.value.data);
      if (evRes.status === 'fulfilled') {
        const data = evRes.value.data;
        const list = Array.isArray(data) ? data : (data.events ?? data.content ?? []);
        setEvents(list);
        // Auto-select first event and pre-fill form
        if (list.length > 0) prefillFromEvent(list[0], list[0].eventId || list[0].id);
      }
      setLoading(false);
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prefillFromEvent = (ev, id) => {
    setSelectedEventId(id ?? '');
    setForm(f => ({
      ...f,
      wedding_date: ev?.eventDate ? ev.eventDate.slice(0, 10) : (ev?.event_date ? ev.event_date.slice(0, 10) : f.wedding_date),
      total_budget: ev?.budget ? String(Math.round(Number(ev.budget))) : f.total_budget,
    }));
  };

  const handleEventSelect = (eventId) => {
    const ev = events.find(e => (e.eventId || e.id) === eventId);
    prefillFromEvent(ev, eventId);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await plannerAPI.create({
        ...form,
        total_budget: form.total_budget ? parseFloat(form.total_budget) : 0,
        eventId: selectedEventId || undefined,
      });
      setPlan(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
    </div>
  );

  if (!plan) return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#C9A84C15] flex items-center justify-center mx-auto mb-4">
            <Heart className="text-[#C9A84C]" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-[#2D2D2D] mb-1" style={{ fontFamily: 'Playfair Display,serif' }}>
            Smart Wedding Planner
          </h1>
          <p className="text-[#5C5C5C] text-sm">
            Plan every detail of your perfect day — budget, guests, venues, menu, and more.
          </p>
        </div>

        {/* Event suggestion banner */}
        {isClient && events.length > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-[#FFF8E7] border border-[#C9A84C40]">
            <p className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wide mb-2 flex items-center gap-1">
              <Calendar size={12} /> Link to your event
            </p>
            <p className="text-sm text-[#5C5C5C] mb-3">
              We found your event{events.length > 1 ? 's' : ''}. Select one to pre-fill your plan details automatically.
            </p>
            <div className="space-y-2">
              {events.map(ev => {
                const id = ev.eventId || ev.id;
                const date = ev.eventDate || ev.event_date;
                const isSelected = selectedEventId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleEventSelect(id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#C9A84C] bg-[#C9A84C10]'
                        : 'border-[#EBE5DB] hover:border-[#C9A84C60] hover:bg-[#FFFBF0]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#2D2D2D]">{ev.name}</p>
                      <p className="text-xs text-[#5C5C5C]">
                        {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Date not set'}
                        {ev.venue ? ` · ${ev.venue}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} className={isSelected ? 'text-[#C9A84C]' : 'text-[#9CA3AF]'} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Plan creation form */}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Wedding Date</label>
            <input
              type="date"
              value={form.wedding_date}
              onChange={e => setForm(f => ({ ...f, wedding_date: e.target.value }))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Theme Style</label>
            <select
              value={form.theme}
              onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
            >
              {THEMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Total Budget (RWF)</label>
            <input
              type="number"
              placeholder="e.g. 5000000"
              value={form.total_budget}
              onChange={e => setForm(f => ({ ...f, total_budget: e.target.value }))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 rounded-xl bg-[#C9A84C] text-white font-bold text-sm hover:bg-[#b8933d] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {selectedEventId ? 'Start Planning My Wedding' : 'Create My Wedding Plan'}
          </button>
        </form>
      </div>
    </div>
  );

  const TabComponent = {
    overview: OverviewTab, budget: BudgetTab, guests: GuestsTab,
    venues: VenuesTab, theme: ThemeTab, menu: MenuTab,
  }[tab];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="bg-white border-b border-[#EBE5DB] px-4 flex-shrink-0">
        <div className="flex overflow-x-auto hide-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === key
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#2D2D2D]'
              }`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <TabComponent plan={plan} onPlanUpdate={setPlan} />
      </div>
    </div>
  );
}
