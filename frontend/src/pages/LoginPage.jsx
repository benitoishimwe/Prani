import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang, LANGUAGES } from '../contexts/LanguageContext';
import { authAPI } from '../services/api';
import { Eye, EyeOff, Loader, Globe, Sparkles, Calendar, Users, MapPin, Briefcase, Heart, Building2 } from 'lucide-react';

const REGISTER_ROLES = [
  { value: 'client',        label: 'Couple / Client',    icon: Heart,      desc: 'Planning your own event' },
  { value: 'vendor',        label: 'Vendor / Supplier',  icon: Briefcase,  desc: 'Offer services to planners' },
  { value: 'event_manager', label: 'Event Planner',      icon: Building2,  desc: 'Manage events for clients' },
];

const ROLE_PATHS = {
  super_admin:   '/super-admin',
  tenant_admin:  '/dashboard',
  staff:         '/dashboard',
  vendor:        '/dashboard',
  client:        '/dashboard',
  event_manager: '/dashboard',
};

export default function LoginPage() {
  const { login } = useAuth();
  const { t, lang, switchLang } = useLang();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'client' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaState, setMfaState] = useState(null);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'register') {
        const res = await authAPI.register({ email: form.email, password: form.password, name: form.name, role: form.role });
        const payload = res.data;
        login(payload.user, payload.token);
        navigate(ROLE_PATHS[payload.user.role] ?? '/dashboard');
      } else {
        const res = await authAPI.login({ email: form.email, password: form.password });
        const payload = res.data;
        if (payload.mfa_required) {
          setMfaState({ userId: payload.userId, method: payload.method });
          setMfaMethod(payload.method || 'totp');
        } else {
          login(payload.user, payload.token);
          navigate(ROLE_PATHS[payload.user.role] ?? '/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await authAPI.sendEmailOtp(mfaState.userId);
      setOtpSent(true);
    } catch {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyMfa({ userId: mfaState.userId, code: mfaCode, method: mfaMethod });
      const payload = res.data.data;
      login(payload.user, payload.token);
      navigate(ROLE_PATHS[payload.user.role] ?? '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{background:'#F9F9FB'}}>
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Professional event planning"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Multi-layer gradient matching landing hero */}
        <div className="absolute inset-0" style={{background:'linear-gradient(160deg, rgba(15,76,92,0.92) 0%, rgba(15,76,92,0.75) 50%, rgba(10,54,66,0.88) 100%)'}} />
        {/* Decorative glow accent */}
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full opacity-10" style={{background:'radial-gradient(circle, #E67E22 0%, transparent 70%)'}} />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top logo + badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/20">
                <span className="text-white font-bold text-lg" style={{fontFamily:'Poppins,sans-serif'}}>P</span>
              </div>
              <span className="text-xl font-bold" style={{fontFamily:'Poppins,sans-serif'}}>Prani</span>
            </div>
            <span className="text-xs bg-white/10 border border-white/20 backdrop-blur px-3 py-1.5 rounded-full text-white/80">
              AI-powered event planning
            </span>
          </div>

          {/* Bottom content */}
          <div>
            <h1 className="text-5xl font-bold mb-4 leading-tight" style={{fontFamily:'Poppins,sans-serif'}}>
              Plan with{' '}
              <span style={{color:'#E67E22'}}>confidence,</span>
              <br />your way.
            </h1>
            <p className="text-base text-white/75 mb-10 leading-relaxed max-w-sm">
              Prani is the all-in-one platform for event planning businesses — from intimate weddings to large-scale corporate conferences, anywhere in the world.
            </p>

            {/* Stats grid — 2×2 on narrow, row on wide */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {[
                { icon: Calendar,  n: '500+',   l: 'Events Managed' },
                { icon: Users,     n: '1,200+', l: 'Happy Clients'  },
                { icon: Sparkles,  n: '98%',    l: 'AI Accuracy'    },
                { icon: MapPin,    n: '20+',    l: 'Countries'      },
              ].map(({ icon: Icon, n, l }) => (
                <div key={l} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(230,126,34,0.18)'}}>
                    <Icon size={16} style={{color:'#E67E22'}} />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none" style={{color:'#E6C975'}}>{n}</p>
                    <p className="text-xs text-white/60 mt-0.5">{l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-12">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center">
            <span className="text-white font-bold text-lg" style={{fontFamily:'Poppins,sans-serif'}}>P</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>Prani</h1>
        </div>

        <div className="w-full max-w-md animate-scale-in">
          {/* Language Toggle */}
          <div className="flex justify-between items-center mb-4">
            <Link to="/" className="text-sm text-[#0F4C5C] hover:underline font-medium">← Back to home</Link>
            <div className="relative">
              <select
                value={lang}
                onChange={e => switchLang(e.target.value)}
                data-testid="lang-toggle-login"
                className="appearance-none flex items-center gap-2 pl-3 pr-7 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#0F4C5C] transition-colors cursor-pointer focus:outline-none focus:border-[#0F4C5C]"
              >
                {LANGUAGES.map(({ code, flag, label }) => (
                  <option key={code} value={code}>{flag} {label}</option>
                ))}
              </select>
              <Globe size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
            {!mfaState ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
                    {tab === 'login' ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-[#6B7280] text-sm mt-1">
                    {tab === 'login' ? 'Sign in to your Prani workspace' : 'Start your 14-day free trial'}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-[#F9F9FB] rounded-xl p-1 mb-6">
                  {['login', 'register'].map((t_) => (
                    <button
                      key={t_}
                      onClick={() => { setTab(t_); setError(''); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === t_ ? 'bg-white text-[#0F4C5C] shadow-sm' : 'text-[#6B7280]'
                      }`}
                      data-testid={`tab-${t_}`}
                    >
                      {t_ === 'login' ? t('auth.login') : t('auth.register')}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {tab === 'register' && (
                    <>
                      {/* Role selector */}
                      <div>
                        <label className="block text-sm font-medium text-[#111827] mb-2">I am a…</label>
                        <div className="grid grid-cols-3 gap-2">
                          {REGISTER_ROLES.map(({ value, label, icon: Icon, desc }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setForm({ ...form, role: value })}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                                form.role === value
                                  ? 'border-[#0F4C5C] bg-[#E8F4F8] text-[#0F4C5C]'
                                  : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#0F4C5C]'
                              }`}
                              data-testid={`role-${value}`}
                            >
                              <Icon size={18} className={form.role === value ? 'text-[#0F4C5C]' : 'text-[#9CA3AF]'} />
                              <span className="text-xs font-semibold leading-tight">{label}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-[#6B7280] mt-1.5 text-center">
                          {REGISTER_ROLES.find(r => r.value === form.role)?.desc}
                        </p>
                      </div>
                      {/* Full name */}
                      <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1.5">{t('auth.name')}</label>
                        <input
                          className="input-wedding"
                          placeholder="Amina Uwase"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                          data-testid="register-name"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">{t('auth.email')}</label>
                    <input
                      className="input-wedding"
                      type="email"
                      placeholder="you@example.rw"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      data-testid="login-email"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-[#111827]">{t('auth.password')}</label>
                      {tab === 'login' && (
                        <span className="text-xs text-[#0F4C5C] hover:underline cursor-pointer font-medium">Forgot password?</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        className="input-wedding pr-10"
                        type={showPwd ? 'text' : 'password'}
                        placeholder={tab === 'register' ? 'Min. 8 characters' : '••••••••'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        minLength={tab === 'register' ? 8 : undefined}
                        required
                        data-testid="login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2" data-testid="login-error">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full h-12 flex items-center justify-center gap-2 text-base"
                    data-testid="login-submit"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : null}
                    {tab === 'login' ? t('auth.login') : t('auth.register')}
                  </button>
                </form>

                {tab === 'register' && (
                  <p className="text-xs text-[#6B7280] text-center mt-4">
                    By registering you agree to our{' '}
                    <a href="#" className="text-[#0F4C5C] hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-[#0F4C5C] hover:underline">Privacy Policy</a>
                  </p>
                )}
              </>
            ) : (
              /* MFA Screen */
              <div className="animate-scale-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#E8F4F8] flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#0F4C5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>{t('auth.mfa_required')}</h2>
                  <p className="text-sm text-[#6B7280] mt-1">Two-factor authentication required</p>
                </div>

                {mfaState.methods?.length > 1 && (
                  <div className="flex gap-2 mb-4">
                    {mfaState.methods.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMfaMethod(m)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                          mfaMethod === m ? 'border-[#0F4C5C] bg-[#E8F4F8] text-[#0F4C5C]' : 'border-[#E5E7EB] text-[#6B7280]'
                        }`}
                        data-testid={`mfa-method-${m}`}
                      >
                        {m === 'totp' ? 'Authenticator App' : 'Email OTP'}
                      </button>
                    ))}
                  </div>
                )}

                {mfaMethod === 'email_otp' && !otpSent && (
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="btn-primary w-full h-11 mb-4 flex items-center justify-center text-sm"
                    data-testid="send-otp-btn"
                  >
                    {loading ? <Loader size={16} className="animate-spin mr-2" /> : null}
                    {t('auth.send_otp')}
                  </button>
                )}

                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">{t('auth.mfa_code')}</label>
                    <input
                      className="input-wedding text-center text-2xl tracking-[0.5em] font-bold"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      data-testid="mfa-code-input"
                    />
                    <p className="text-xs text-[#6B7280] mt-1.5 text-center">
                      {mfaMethod === 'totp' ? t('auth.totp_prompt') : t('auth.email_otp_prompt')}
                    </p>
                  </div>
                  {error && <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2" data-testid="mfa-error">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || mfaCode.length < 6}
                    className="btn-primary w-full h-12 flex items-center justify-center gap-2"
                    data-testid="mfa-verify-btn"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : null}
                    {t('auth.verify')}
                  </button>
                  <button type="button" onClick={() => setMfaState(null)} className="w-full text-sm text-[#6B7280] hover:text-[#111827]">
                    {t('common.back')}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
