import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Star, MapPin, Heart, ShoppingBag, ChevronRight,
  ArrowLeft, X, Phone, Globe, Instagram, Facebook, DollarSign,
  MessageSquare, CheckCircle, Send, RefreshCw, User, ChevronDown,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'catering', label: 'Catering' },
  { key: 'decor', label: 'Decor' },
  { key: 'music', label: 'Music & DJ' },
  { key: 'photography', label: 'Photography' },
  { key: 'transport', label: 'Transport' },
  { key: 'venue', label: 'Venue' },
  { key: 'makeup', label: 'Makeup' },
  { key: 'flowers', label: 'Flowers' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'entertainment', label: 'Entertainment' },
];

const CATEGORY_EMOJI = {
  catering: '🍽️', decor: '🌸', music: '🎵', photography: '📸',
  transport: '🚗', venue: '🏛️', makeup: '💄', flowers: '💐',
  lighting: '💡', entertainment: '🎭',
};

function getCategoryEmoji(cat) {
  return CATEGORY_EMOJI[cat] || '✨';
}

function StarRow({ rating, max = 5, size = 13 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={size} className={i < Math.round(rating) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#D1D5DB]'} />
      ))}
    </div>
  );
}

// ─── Vendor grid card ──────────────────────────────────────────────────────────
function VendorCard({ vendor, isFavorited, onFavorite, onClick }) {
  const rating = vendor.rating || 0;
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.10)] transition-all cursor-pointer group"
    >
      <div className="h-40 bg-gradient-to-br from-[#F5F0E8] to-[#EBE5DB] relative">
        <div className="absolute inset-0 flex items-center justify-center text-4xl">
          {getCategoryEmoji(vendor.category)}
        </div>
        {vendor.isVerified && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#4A7C59] text-white text-[10px] font-bold rounded-full">
            Verified
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(e, vendor.vendorId); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
        >
          {isFavorited
            ? <Heart size={14} className="text-[#D9534F] fill-[#D9534F]" />
            : <Heart size={14} className="text-[#5C5C5C]" />}
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#2D2D2D] text-sm truncate">{vendor.name}</h3>
            <span className="text-xs text-[#C9A84C] capitalize font-medium">{vendor.category}</span>
          </div>
          {rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={12} className="text-[#C9A84C] fill-[#C9A84C]" />
              <span className="text-xs font-semibold text-[#2D2D2D]">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {vendor.location && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-[#5C5C5C]">
            <MapPin size={10} /><span className="truncate">{vendor.location}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[#5C5C5C]">
            {vendor.priceMin
              ? `From ${vendor.currency || 'USD'} ${Number(vendor.priceMin).toLocaleString()}`
              : 'Price on request'}
          </span>
          <ChevronRight size={14} className="text-[#C9A84C] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}

// ─── Vendor detail modal ───────────────────────────────────────────────────────
function VendorDetailModal({ vendorId, onClose, isFavorited, onFavorite, user, navigate }) {
  const [vendor, setVendor]       = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('about'); // 'about' | 'reviews' | 'contact'

  // Inquiry form
  const [inquiry, setInquiry]     = useState({ message: '', budget: '', eventDate: '' });
  const [sendingInquiry, setSendingInquiry] = useState(false);

  // Review form
  const [review, setReview]       = useState({ rating: 5, title: '', body: '' });
  const [sendingReview, setSendingReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/marketplace/vendors/${vendorId}`),
      api.get(`/marketplace/vendors/${vendorId}/reviews`, { params: { size: 10 } }),
    ])
      .then(([vRes, rRes]) => {
        setVendor(vRes.data);
        const rPayload = rRes.data;
        setReviews(Array.isArray(rPayload) ? rPayload : (rPayload?.data || []));
      })
      .catch(() => toast.error('Failed to load vendor profile'))
      .finally(() => setLoading(false));
  }, [vendorId]);

  const handleInquiry = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSendingInquiry(true);
    try {
      await api.post(`/marketplace/vendors/${vendorId}/inquiries`, {
        message: inquiry.message || undefined,
        budget:  inquiry.budget  ? Number(inquiry.budget) : undefined,
        eventDate: inquiry.eventDate || undefined,
      });
      toast.success('Inquiry sent! The vendor will get back to you.');
      setInquiry({ message: '', budget: '', eventDate: '' });
      setTab('about');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send inquiry');
    } finally {
      setSendingInquiry(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSendingReview(true);
    try {
      await api.post(`/marketplace/vendors/${vendorId}/reviews`, {
        rating: review.rating,
        title:  review.title  || undefined,
        body:   review.body   || undefined,
      });
      toast.success('Review submitted!');
      setReviewDone(true);
      // Refresh reviews
      const rRes = await api.get(`/marketplace/vendors/${vendorId}/reviews`, { params: { size: 10 } });
      const rPayload = rRes.data;
      setReviews(Array.isArray(rPayload) ? rPayload : (rPayload?.data || []));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSendingReview(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] focus:border-[#C9A84C]';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[92vh] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {loading ? (
          <div className="p-6 flex items-center gap-4 border-b border-[#F0EAE0]">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F0E8] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-[#F5F0E8] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[#F5F0E8] rounded animate-pulse" />
            </div>
          </div>
        ) : vendor ? (
          <div className="px-6 py-4 border-b border-[#F0EAE0] flex items-start gap-4">
            {/* Category icon */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F5F0E8] to-[#EBE5DB] flex items-center justify-center text-2xl flex-shrink-0">
              {getCategoryEmoji(vendor.category)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-[#2D2D2D] text-lg truncate" style={{ fontFamily: 'Playfair Display,serif' }}>
                  {vendor.name}
                </h2>
                {vendor.isVerified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-[#E8F5EE] text-[#4A7C59] text-[10px] font-bold rounded-full">
                    <CheckCircle size={10} /> Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-[#C9A84C] capitalize font-medium">{vendor.category}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {vendor.location && (
                  <span className="flex items-center gap-1 text-xs text-[#5C5C5C]">
                    <MapPin size={11} />{vendor.location}
                  </span>
                )}
                {vendor.rating > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#2D2D2D]">
                    <Star size={11} className="text-[#C9A84C] fill-[#C9A84C]" />
                    {Number(vendor.rating).toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => onFavorite(e, vendor.vendorId)}
                className="p-2 rounded-xl border border-[#EBE5DB] hover:border-[#D9534F] transition-colors"
              >
                {isFavorited
                  ? <Heart size={16} className="text-[#D9534F] fill-[#D9534F]" />
                  : <Heart size={16} className="text-[#5C5C5C]" />}
              </button>
              <button onClick={onClose} className="p-2 rounded-xl border border-[#EBE5DB] hover:bg-[#F5F0E8] transition-colors">
                <X size={16} className="text-[#5C5C5C]" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        {!loading && vendor && (
          <div className="flex gap-0 px-6 border-b border-[#F0EAE0]">
            {[
              { key: 'about',   label: 'About' },
              { key: 'reviews', label: `Reviews${reviews.length ? ` (${reviews.length})` : ''}` },
              { key: 'contact', label: 'Contact' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === key
                    ? 'border-[#C9A84C] text-[#C9A84C]'
                    : 'border-transparent text-[#5C5C5C] hover:text-[#2D2D2D]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-4 bg-[#F5F0E8] rounded animate-pulse" />)}
            </div>
          ) : !vendor ? (
            <div className="p-8 text-center text-[#5C5C5C]">
              <p>Could not load vendor profile.</p>
            </div>
          ) : (
            <>
              {/* ── About tab ── */}
              {tab === 'about' && (
                <div className="p-6 space-y-5">
                  {/* Bio */}
                  {vendor.profile?.bio && (
                    <div>
                      <h3 className="text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-2">About</h3>
                      <p className="text-sm text-[#2D2D2D] leading-relaxed">{vendor.profile.bio}</p>
                    </div>
                  )}

                  {/* Pricing */}
                  {(vendor.profile?.priceMin || vendor.profile?.priceMax) && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FDF8F0] border border-[#EBE5DB]">
                      <DollarSign size={16} className="text-[#C9A84C] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-0.5">Pricing</p>
                        <p className="text-sm font-semibold text-[#2D2D2D]">
                          {vendor.profile.priceMin && vendor.profile.priceMax
                            ? `${vendor.profile.currency || 'USD'} ${Number(vendor.profile.priceMin).toLocaleString()} – ${Number(vendor.profile.priceMax).toLocaleString()}`
                            : vendor.profile.priceMin
                            ? `From ${vendor.profile.currency || 'USD'} ${Number(vendor.profile.priceMin).toLocaleString()}`
                            : `Up to ${vendor.profile.currency || 'USD'} ${Number(vendor.profile.priceMax).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Contact details */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#5C5C5C] uppercase tracking-wide">Contact</h3>
                    {vendor.contactName && (
                      <div className="flex items-center gap-2 text-sm text-[#2D2D2D]">
                        <User size={14} className="text-[#C9A84C]" /> {vendor.contactName}
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-sm text-[#2D2D2D]">
                        <Phone size={14} className="text-[#C9A84C]" /> {vendor.phone}
                      </div>
                    )}
                    {vendor.profile?.website && (
                      <a href={vendor.profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#0F4C5C] hover:underline">
                        <Globe size={14} className="text-[#C9A84C]" /> {vendor.profile.website}
                      </a>
                    )}
                    {vendor.profile?.instagram && (
                      <div className="flex items-center gap-2 text-sm text-[#2D2D2D]">
                        <Instagram size={14} className="text-[#C9A84C]" /> {vendor.profile.instagram}
                      </div>
                    )}
                    {vendor.profile?.facebook && (
                      <div className="flex items-center gap-2 text-sm text-[#2D2D2D]">
                        <Facebook size={14} className="text-[#C9A84C]" /> {vendor.profile.facebook}
                      </div>
                    )}
                    {!vendor.contactName && !vendor.phone && !vendor.profile?.website && (
                      <p className="text-sm text-[#9CA3AF]">No contact details provided</p>
                    )}
                  </div>

                  {/* Portfolio thumbnails */}
                  {vendor.portfolio?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-[#5C5C5C] uppercase tracking-wide mb-2">Portfolio</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {vendor.portfolio.slice(0, 6).map((item) => (
                          <img
                            key={item.portfolioId}
                            src={item.imageUrl}
                            alt={item.caption || vendor.name}
                            className="w-full h-24 object-cover rounded-xl"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => setTab('contact')}
                    className="w-full py-3 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#9A7D2E] transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={15} /> Send Inquiry
                  </button>
                </div>
              )}

              {/* ── Reviews tab ── */}
              {tab === 'reviews' && (
                <div className="p-6 space-y-5">
                  {/* Rating summary */}
                  {vendor.rating > 0 && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FDF8F0]">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
                          {Number(vendor.rating).toFixed(1)}
                        </p>
                        <StarRow rating={vendor.rating} />
                        <p className="text-xs text-[#9CA3AF] mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )}

                  {/* Reviews list */}
                  {reviews.length === 0 ? (
                    <p className="text-sm text-center text-[#9CA3AF] py-6">No reviews yet. Be the first!</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((r) => (
                        <div key={r.reviewId} className="border-b border-[#F0EAE0] last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#0F4C5C] flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{r.user?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                              </div>
                              <span className="text-sm font-semibold text-[#2D2D2D]">{r.user?.name || 'Anonymous'}</span>
                            </div>
                            <StarRow rating={r.rating} size={12} />
                          </div>
                          {r.title && <p className="text-sm font-medium text-[#2D2D2D] ml-9">{r.title}</p>}
                          {r.body  && <p className="text-sm text-[#5C5C5C] ml-9 mt-0.5">{r.body}</p>}
                          <p className="text-xs text-[#9CA3AF] ml-9 mt-1">
                            {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Write review */}
                  {user && !reviewDone && (
                    <form onSubmit={handleReview} className="pt-4 border-t border-[#F0EAE0] space-y-3">
                      <h3 className="text-sm font-bold text-[#2D2D2D]">Write a Review</h3>
                      <div>
                        <label className="block text-xs text-[#5C5C5C] mb-1">Rating</label>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <button key={n} type="button" onClick={() => setReview(r => ({ ...r, rating: n }))}>
                              <Star size={22} className={n <= review.rating ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#D1D5DB]'} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        value={review.title}
                        onChange={e => setReview(r => ({ ...r, title: e.target.value }))}
                        placeholder="Review title (optional)"
                        className={inputCls}
                      />
                      <textarea
                        value={review.body}
                        onChange={e => setReview(r => ({ ...r, body: e.target.value }))}
                        placeholder="Share your experience…"
                        rows={3}
                        className={`${inputCls} resize-none`}
                      />
                      <button
                        type="submit"
                        disabled={sendingReview}
                        className="w-full py-2.5 bg-[#0F4C5C] text-white rounded-xl text-sm font-semibold hover:bg-[#1A6B82] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {sendingReview ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        {sendingReview ? 'Submitting…' : 'Submit Review'}
                      </button>
                    </form>
                  )}
                  {reviewDone && (
                    <div className="flex items-center gap-2 text-sm text-[#4A7C59] bg-[#E8F5EE] rounded-xl px-4 py-3">
                      <CheckCircle size={15} /> Review submitted — thank you!
                    </div>
                  )}
                  {!user && (
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full py-2.5 border border-[#EBE5DB] text-sm text-[#5C5C5C] rounded-xl hover:border-[#C9A84C] transition-colors"
                    >
                      Log in to write a review
                    </button>
                  )}
                </div>
              )}

              {/* ── Contact / Inquiry tab ── */}
              {tab === 'contact' && (
                <div className="p-6">
                  {!user ? (
                    <div className="text-center py-8">
                      <MessageSquare size={36} className="mx-auto mb-3 text-[#EBE5DB]" />
                      <p className="text-sm font-medium text-[#2D2D2D] mb-1">Log in to send an inquiry</p>
                      <p className="text-xs text-[#9CA3AF] mb-4">Create a free account to contact vendors</p>
                      <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#9A7D2E]"
                      >
                        Log in
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleInquiry} className="space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-[#2D2D2D] mb-1" style={{ fontFamily: 'Playfair Display,serif' }}>
                          Send an Inquiry to {vendor.name}
                        </h3>
                        <p className="text-xs text-[#9CA3AF]">The vendor will reply to your registered email address.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Message</label>
                        <textarea
                          value={inquiry.message}
                          onChange={e => setInquiry(i => ({ ...i, message: e.target.value }))}
                          placeholder="Hi, I'm interested in your services for my event…"
                          rows={4}
                          required
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Budget (optional)</label>
                          <input
                            type="number"
                            value={inquiry.budget}
                            onChange={e => setInquiry(i => ({ ...i, budget: e.target.value }))}
                            placeholder="e.g. 500"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Event Date (optional)</label>
                          <input
                            type="date"
                            value={inquiry.eventDate}
                            onChange={e => setInquiry(i => ({ ...i, eventDate: e.target.value }))}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={sendingInquiry || !inquiry.message.trim()}
                        className="w-full py-3 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#9A7D2E] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {sendingInquiry ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        {sendingInquiry ? 'Sending…' : 'Send Inquiry'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vendors, setVendors]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [favorites, setFavorites]   = useState(new Set());
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeVendorId, setActiveVendorId] = useState(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, size: 12 });
      if (category) params.append('category', category);
      if (search)   params.append('search', search);
      const res = await api.get(`/marketplace/vendors?${params}`);
      const payload = res.data;
      const arr = Array.isArray(payload)
        ? payload
        : (payload?.data || payload?.vendors || payload?.content || []);
      setVendors(Array.isArray(arr) ? arr : []);
      setTotalPages(payload?.meta?.totalPages || payload?.totalPages || 1);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/marketplace/favorites');
      const ids = res.data?.vendor_ids || res.data?.vendorIds || [];
      setFavorites(new Set(ids));
    } catch {}
  }, [user]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);
  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = async (e, vendorId) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      if (favorites.has(vendorId)) {
        await api.delete(`/marketplace/favorites/${vendorId}`);
        setFavorites(prev => { const s = new Set(prev); s.delete(vendorId); return s; });
      } else {
        await api.post(`/marketplace/favorites/${vendorId}`);
        setFavorites(prev => new Set([...prev, vendorId]));
      }
    } catch {}
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        {user && (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-[#5C5C5C] hover:text-[#0F4C5C] mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        )}
        <h1 className="text-3xl font-bold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Vendor Marketplace
        </h1>
        <p className="text-[#5C5C5C]">Discover and connect with verified event vendors worldwide</p>
      </div>

      {/* Search & filter */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9C9C]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search vendors by name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] focus:border-[#C9A84C]"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(0); }}
          className="px-4 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] bg-white text-[#2D2D2D]"
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setPage(0); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === c.key
                ? 'bg-[#C9A84C] text-white'
                : 'bg-white text-[#5C5C5C] border border-[#EBE5DB] hover:border-[#C9A84C]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 text-[#5C5C5C]">
          <ShoppingBag size={40} className="mx-auto mb-3 text-[#EBE5DB]" />
          <p className="font-medium">No vendors found</p>
          <p className="text-sm mt-1 text-[#9CA3AF]">
            {search || category ? 'Try adjusting your search or category filter.' : 'No vendors have been added yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vendors.map(vendor => (
            <VendorCard
              key={vendor.vendorId}
              vendor={vendor}
              isFavorited={favorites.has(vendor.vendorId)}
              onFavorite={toggleFavorite}
              onClick={() => setActiveVendorId(vendor.vendorId)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-full border border-[#EBE5DB] text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-[#5C5C5C]">Page {page + 1} of {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-full border border-[#EBE5DB] text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Vendor detail modal */}
      {activeVendorId && (
        <VendorDetailModal
          vendorId={activeVendorId}
          onClose={() => setActiveVendorId(null)}
          isFavorited={favorites.has(activeVendorId)}
          onFavorite={toggleFavorite}
          user={user}
          navigate={navigate}
        />
      )}
    </div>
  );
}
