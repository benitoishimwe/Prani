import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Users, Heart } from 'lucide-react';
import api from '../services/api';

const TEMPLATES = [
  { id: 'elegant-floral',    color: '#C9A84C' },
  { id: 'modern-minimal',    color: '#2D2D2D' },
  { id: 'rustic-garden',     color: '#4A7C59' },
  { id: 'rwandan-tradition', color: '#D4A373' },
  { id: 'corporate-clean',   color: '#6B8E9B' },
];

export default function PublicSaveTheDatePage() {
  const { designId } = useParams();
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/save-the-date/public/${designId}`)
      .then(res => setDesign(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [designId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#C9A84C] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">💌</div>
        <h1 className="text-2xl font-bold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Georgia,serif' }}>
          Card not found
        </h1>
        <p className="text-[#5C5C5C]">This save-the-date card may have been unpublished or the link is incorrect.</p>
      </div>
    );
  }

  const tc     = (typeof design.textContent === 'object' && design.textContent) ? design.textContent : {};
  const ai     = tc.aiGenerated || {};
  const primary = (typeof design.style === 'object' && design.style?.primaryColor)
    || TEMPLATES.find(t => t.id === design.templateId)?.color
    || '#C9A84C';

  const names   = ai.coupleNames || tc.headline || design.title;
  const date    = ai.date    || tc.eventDate || '';
  const venue   = ai.venue   || tc.venue     || '';
  const tagline = ai.tagline || '';
  const rsvp    = ai.rsvp    || tc.rsvpInfo  || '';

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 py-12">
      {/* Prani branding */}
      <div className="mb-8 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#0F4C5C] flex items-center justify-center">
          <span className="text-white font-bold text-xs" style={{ fontFamily: 'Poppins,sans-serif' }}>P</span>
        </div>
        <span className="text-sm font-semibold text-[#0F4C5C]" style={{ fontFamily: 'Poppins,sans-serif' }}>Prani</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        {/* Photo or gradient header */}
        {design.uploadedPhoto ? (
          <div className="relative h-72">
            <img src={design.uploadedPhoto} alt="Couple" className="w-full h-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 35%, rgba(255,255,255,0) 58%)' }}
            />
            <div className="absolute top-0 left-0 right-0 px-6 pt-6 text-center">
              <p className="text-[10px] font-bold tracking-[5px]" style={{ color: primary }}>SAVE THE DATE</p>
              <h1 className="text-3xl mt-2 font-serif italic text-[#2D2D2D] leading-tight">{names}</h1>
              {date  && <p className="text-sm text-[#5C5C5C] mt-2">{date}</p>}
              {venue && <p className="text-xs text-[#7A7A7A] mt-1">{venue}</p>}
            </div>
          </div>
        ) : design.generatedImageUrl ? (
          <div className="bg-[#FDF8F0]">
            <img src={design.generatedImageUrl} alt={design.title} className="w-full object-contain" style={{ maxHeight: 320 }} />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center px-8 py-12 text-center"
            style={{ background: `linear-gradient(135deg, ${primary}18, ${primary}30)` }}
          >
            <p className="text-[10px] font-bold tracking-[5px] mb-4" style={{ color: primary }}>SAVE THE DATE</p>
            <h1 className="text-3xl font-serif italic text-[#2D2D2D] leading-tight">{names}</h1>
            {date  && <p className="text-sm text-[#5C5C5C] mt-3">{date}</p>}
            {venue && <p className="text-xs text-[#9A9A9A] mt-1">{venue}</p>}
          </div>
        )}

        {/* Details */}
        <div className="px-8 py-6">
          {tagline && (
            <p className="text-sm italic text-center mb-5" style={{ color: primary }}>"{tagline}"</p>
          )}

          <div className="space-y-3">
            {names && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}18` }}>
                  <Heart size={14} style={{ color: primary }} />
                </div>
                <div>
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold">Couple</p>
                  <p className="text-sm font-semibold text-[#2D2D2D]">{names}</p>
                </div>
              </div>
            )}
            {date && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}18` }}>
                  <Calendar size={14} style={{ color: primary }} />
                </div>
                <div>
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold">Date</p>
                  <p className="text-sm font-semibold text-[#2D2D2D]">{date}</p>
                </div>
              </div>
            )}
            {venue && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}18` }}>
                  <MapPin size={14} style={{ color: primary }} />
                </div>
                <div>
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold">Venue</p>
                  <p className="text-sm font-semibold text-[#2D2D2D]">{venue}</p>
                </div>
              </div>
            )}
            {rsvp && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}18` }}>
                  <Users size={14} style={{ color: primary }} />
                </div>
                <div>
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold">RSVP</p>
                  <p className="text-sm font-semibold text-[#2D2D2D]">{rsvp}</p>
                </div>
              </div>
            )}
          </div>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: `${primary}30` }} />
            <span style={{ color: primary }} className="text-sm">♦</span>
            <div className="flex-1 h-px" style={{ background: `${primary}30` }} />
          </div>

          <p className="text-xs text-center text-[#9CA3AF]">
            We can't wait to celebrate with you!
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-[#9CA3AF]">
        Created with <span className="text-[#0F4C5C] font-semibold">Prani</span> · Event Planning Platform
      </p>
    </div>
  );
}
