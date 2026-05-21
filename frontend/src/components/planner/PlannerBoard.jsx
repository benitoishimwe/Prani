import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Users, CalendarPlus, Clock, Calendar, X, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_SCHEDULE = [
  { dayOffset: 0, startTime: '07:00', endTime: '14:00', role: 'Setup Crew' },
  { dayOffset: 0, startTime: '09:00', endTime: '17:00', role: 'Event Coordinator' },
  { dayOffset: 0, startTime: '18:00', endTime: '23:00', role: 'AV Technician' },
  { dayOffset: 1, startTime: '08:00', endTime: '16:00', role: 'Photography Assistant' },
  { dayOffset: 1, startTime: '12:00', endTime: '21:00', role: 'Catering Staff' },
  { dayOffset: 1, startTime: '14:00', endTime: '22:00', role: 'Security Guard' },
  { dayOffset: 2, startTime: '07:00', endTime: '15:00', role: 'Registration Desk' },
  { dayOffset: 2, startTime: '16:00', endTime: '23:00', role: 'Cleanup Crew' },
];

const ROLE_PALETTE = [
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', bar: 'bg-orange-400' },
  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   bar: 'bg-blue-400'   },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', bar: 'bg-purple-400' },
  { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',bar: 'bg-emerald-400'},
  { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   bar: 'bg-rose-400'   },
  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  bar: 'bg-amber-400'  },
  { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200',   bar: 'bg-cyan-400'   },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', bar: 'bg-violet-400' },
];

function rolePalette(role) {
  let h = 0;
  for (let i = 0; i < (role || '').length; i++) h = role.charCodeAt(i) + ((h << 5) - h);
  return ROLE_PALETTE[Math.abs(h) % ROLE_PALETTE.length];
}

function timePct(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return ((h * 60 + m) / 1440) * 100;
}

function dateLabel(iso) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tom   = new Date(today); tom.setDate(tom.getDate() + 1);
  const day   = new Date(d);    day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === tom.getTime())   return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function initials(name) {
  return (name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Edit Shift Modal ──────────────────────────────────────────────────────────
function ShiftEditModal({ shift, staffList, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    role:      shift.role      || '',
    date:      shift.date      ? new Date(shift.date).toISOString().split('T')[0] : '',
    startTime: shift.startTime || '',
    endTime:   shift.endTime   || '',
    staffId:   shift.staffId   || '',
    staffName: shift.staffName || '',
  });
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleStaffChange = (e) => {
    const member = staffList.find(s => s.userId === e.target.value);
    setForm(f => ({ ...f, staffId: member?.userId || '', staffName: member?.name || '' }));
  };

  const handleSave = async () => {
    if (!form.role.trim())      return toast.error('Role is required');
    if (!form.date)             return toast.error('Date is required');
    if (!form.startTime)        return toast.error('Start time is required');
    if (!form.endTime)          return toast.error('End time is required');
    if (form.startTime >= form.endTime) return toast.error('End time must be after start time');
    setSaving(true);
    try {
      await onSave(shift.shiftId, {
        role:      form.role.trim(),
        date:      new Date(form.date).toISOString(),
        startTime: form.startTime,
        endTime:   form.endTime,
        staffId:   form.staffId   || null,
        staffName: form.staffName || null,
      });
      onClose();
    } catch {
      toast.error('Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(shift.shiftId);
      onClose();
    } catch {
      toast.error('Failed to delete shift');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE5DB] bg-[#FAFAF8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center">
              <Pencil size={14} className="text-[#C9A84C]" />
            </div>
            <h2 className="font-bold text-[#2D2D2D] text-base" style={{ fontFamily: 'Playfair Display,serif' }}>
              Edit Shift
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9C9C9C] hover:bg-[#F5F0E8] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Role / Position</label>
            <input
              type="text"
              value={form.role}
              onChange={e => set('role', e.target.value)}
              placeholder="e.g. Setup Crew, AV Technician…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DDD8] text-sm text-[#2D2D2D] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C20] transition-all"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DDD8] text-sm text-[#2D2D2D] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C20] transition-all"
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DDD8] text-sm text-[#2D2D2D] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C20] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-1.5">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DDD8] text-sm text-[#2D2D2D] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C20] transition-all"
              />
            </div>
          </div>

          {/* Assign Staff */}
          <div>
            <label className="block text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Assigned Staff</label>
            <select
              value={form.staffId}
              onChange={handleStaffChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DDD8] text-sm text-[#2D2D2D] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C20] transition-all bg-white"
            >
              <option value="">— Unassigned —</option>
              {staffList.map(m => (
                <option key={m.userId} value={m.userId}>{m.name} ({(m.role || '').replace(/_/g, ' ')})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EBE5DB] bg-[#FAFAF8] flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition-all disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5C5C5C] hover:bg-[#F5F0E8] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#C9A84C] text-white hover:bg-[#B8943D] transition-all disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Draggable staff chip ──────────────────────────────────────────────────────
function StaffChip({ member }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${member.userId}`,
    data: { member },
  });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={`flex items-center gap-2.5 p-2.5 bg-white border border-[#EBE5DB] rounded-xl cursor-grab active:cursor-grabbing select-none transition-all group ${
        isDragging ? 'opacity-40 scale-95' : 'hover:border-[#C9A84C] hover:shadow-sm'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E6C975] text-white flex items-center justify-center text-xs font-bold shrink-0">
        {initials(member.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#2D2D2D] truncate leading-tight">{member.name}</p>
        <p className="text-[10px] text-[#9C9C9C] capitalize truncate">{(member.role || '').replace(/_/g, ' ')}</p>
      </div>
      <GripVertical size={13} className="text-[#CCCCCC] shrink-0 group-hover:text-[#C9A84C] transition-colors" />
    </div>
  );
}

// ── Droppable shift card ──────────────────────────────────────────────────────
function ShiftCard({ shift, onUnassign, onEdit }) {
  const { isOver, setNodeRef } = useDroppable({ id: `shift-${shift.shiftId}`, data: { shift } });
  const pal      = rolePalette(shift.role || '');
  const startPct = timePct(shift.startTime);
  const endPct   = timePct(shift.endTime);
  const widthPct = Math.max(endPct - startPct, 3);
  const assigned = Boolean(shift.staffName);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 p-3.5 transition-all duration-150 group/card ${
        isOver    ? 'border-[#C9A84C] bg-[#FFFBF0] shadow-lg scale-[1.02]'
        : assigned ? 'border-[#E8F5EE] bg-white shadow-sm'
        :            'border-dashed border-[#E0DDD8] bg-white hover:border-[#C9A84C50]'
      }`}
    >
      {/* Role badge + time + edit button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-[50%] ${pal.bg} ${pal.text} ${pal.border}`}>
          {shift.role}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-[#9C9C9C] font-mono">{shift.startTime} – {shift.endTime}</span>
          <button
            type="button"
            onClick={() => onEdit(shift)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#CCCCCC] hover:bg-[#F5F0E8] hover:text-[#C9A84C] transition-all opacity-0 group-hover/card:opacity-100"
            title="Edit shift"
          >
            <Pencil size={11} />
          </button>
        </div>
      </div>

      {/* 24h time bar */}
      <div className="relative h-1.5 bg-[#F0EDE8] rounded-full mb-3 overflow-hidden">
        <div className={`absolute top-0 h-full rounded-full ${pal.bar}`} style={{ left: `${startPct}%`, width: `${widthPct}%` }} />
      </div>

      {/* Assignment zone */}
      {assigned ? (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-[#F0F7F3] rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#4A7C59] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            {initials(shift.staffName)}
          </div>
          <span className="text-xs font-semibold text-[#2D2D2D] truncate flex-1">{shift.staffName}</span>
          <button
            type="button"
            onClick={() => onUnassign(shift.shiftId)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#9C9C9C] hover:bg-red-100 hover:text-red-500 transition-colors shrink-0"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <div className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-dashed transition-colors ${
          isOver ? 'border-[#C9A84C] bg-[#FFFBF0]' : 'border-[#E0DDD8]'
        }`}>
          <Users size={11} className={isOver ? 'text-[#C9A84C]' : 'text-[#CCCCCC]'} />
          <span className={`text-[11px] font-medium ${isOver ? 'text-[#C9A84C]' : 'text-[#CCCCCC]'}`}>
            {isOver ? 'Release to assign' : 'Drop staff here'}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────
export default function PlannerBoard({ staffList, shiftsList, onAssignmentChange, onShiftsGenerated, onShiftUpdate, onShiftDelete }) {
  const [activeId,     setActiveId]     = useState(null);
  const [editingShift, setEditingShift] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Group by date
  const grouped = {};
  for (const s of shiftsList) {
    const key = s.date ? new Date(s.date).toISOString().split('T')[0] : 'unscheduled';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }
  const sortedDates = Object.keys(grouped).sort();

  const handleDragStart = (e) => setActiveId(e.active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    if (active.id.startsWith('staff-') && over.id.startsWith('shift-')) {
      const staffId = active.id.replace('staff-', '');
      const shiftId = over.id.replace('shift-', '');
      const member  = staffList.find(s => s.userId === staffId);
      if (member) onAssignmentChange(shiftId, staffId, member.name);
    }
  };

  const generateShifts = () => {
    const today  = new Date();
    const shifts = DEMO_SCHEDULE.map((tmpl, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + tmpl.dayOffset);
      return {
        shiftId:   `demo-${Date.now()}-${i}`,
        role:      tmpl.role,
        date:      d.toISOString(),
        startTime: tmpl.startTime,
        endTime:   tmpl.endTime,
        staffId:   null,
        staffName: '',
        status:    'scheduled',
      };
    });
    onShiftsGenerated?.(shifts);
    toast.success(`Generated ${shifts.length} demo shifts across 3 days`);
  };

  const activeMember = activeId?.startsWith('staff-')
    ? staffList.find(s => `staff-${s.userId}` === activeId)
    : null;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-5 mt-2" style={{ height: 'calc(100vh - 280px)', minHeight: 520 }}>

          {/* ── Left: Staff Directory ── */}
          <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl border border-[#EBE5DB] flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#EBE5DB] flex items-center gap-2">
              <Users size={15} className="text-[#C9A84C]" />
              <span className="font-bold text-[#2D2D2D] text-sm" style={{ fontFamily: 'Playfair Display,serif' }}>Staff Directory</span>
              <span className="ml-auto text-[10px] text-[#9C9C9C] bg-[#F5F0E8] px-2 py-0.5 rounded-full">{staffList.length}</span>
            </div>
            <p className="text-[10px] text-[#9C9C9C] px-4 pt-2 pb-1 leading-relaxed">
              Drag a name onto a shift to assign them
            </p>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {staffList.map(m => <StaffChip key={m.userId} member={m} />)}
              {!staffList.length && <p className="text-xs text-[#9C9C9C] italic text-center pt-6">No staff found</p>}
            </div>
          </div>

          {/* ── Right: Shift Timeline ── */}
          <div className="flex-1 bg-white rounded-2xl border border-[#EBE5DB] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EBE5DB] flex items-center gap-3">
              <Clock size={15} className="text-[#C9A84C]" />
              <span className="font-bold text-[#2D2D2D] text-sm" style={{ fontFamily: 'Playfair Display,serif' }}>Shift Timeline</span>
              <span className="text-[10px] text-[#9C9C9C] bg-[#F5F0E8] px-2 py-0.5 rounded-full">
                {shiftsList.filter(s => s.staffName).length}/{shiftsList.length} assigned
              </span>
              <button
                onClick={generateShifts}
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0F4C5C] text-white text-xs font-semibold hover:bg-[#1A7A8A] transition-colors"
              >
                <CalendarPlus size={12} />
                Generate Shifts
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-3">
                    <Clock size={24} className="text-[#C9A84C] opacity-50" />
                  </div>
                  <p className="text-sm font-semibold text-[#5C5C5C] mb-1">No shifts scheduled</p>
                  <p className="text-xs text-[#9C9C9C] mb-5">Click "Generate Shifts" to populate the timeline with demo data</p>
                  <button
                    onClick={generateShifts}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#B8943D] transition-colors"
                  >
                    <CalendarPlus size={13} />
                    Generate Demo Shifts
                  </button>
                </div>
              ) : (
                <div className="space-y-7">
                  {sortedDates.map(dateKey => (
                    <div key={dateKey}>
                      {/* Date header */}
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={13} className="text-[#C9A84C]" />
                        <span className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wide">{dateLabel(dateKey)}</span>
                        <span className="text-[10px] text-[#9C9C9C]">
                          {new Date(dateKey).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <div className="flex-1 h-px bg-[#F0EDE8]" />
                        <span className="text-[10px] text-[#9C9C9C]">
                          {grouped[dateKey].filter(s => s.staffName).length}/{grouped[dateKey].length} filled
                        </span>
                      </div>
                      {/* Shift grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        {[...grouped[dateKey]]
                          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                          .map(shift => (
                            <ShiftCard
                              key={shift.shiftId}
                              shift={shift}
                              onUnassign={(id) => onAssignmentChange(id, null, null)}
                              onEdit={setEditingShift}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag ghost */}
        <DragOverlay dropAnimation={null}>
          {activeMember && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white border-2 border-[#C9A84C] rounded-xl shadow-2xl cursor-grabbing w-52 opacity-95">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E6C975] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {initials(activeMember.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2D2D2D] truncate">{activeMember.name}</p>
                <p className="text-[10px] text-[#C9A84C] font-medium">Assigning…</p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Edit modal — outside DndContext so it renders above the overlay */}
      {editingShift && (
        <ShiftEditModal
          shift={editingShift}
          staffList={staffList}
          onSave={async (shiftId, fields) => {
            await onShiftUpdate?.(shiftId, fields);
          }}
          onDelete={async (shiftId) => {
            await onShiftDelete?.(shiftId);
          }}
          onClose={() => setEditingShift(null)}
        />
      )}
    </>
  );
}
