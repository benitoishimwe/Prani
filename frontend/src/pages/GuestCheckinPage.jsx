import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export default function GuestCheckinPage() {
  const { eventId } = useParams();
  const [step, setStep] = useState(1); // 1=email form, 2=OTP form, 3=success
  const [email, setEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkinData, setCheckinData] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/api/public/guest/checkin/request-otp`, {
        eventId,
        email: email.trim(),
        guestName: guestName.trim() || undefined,
      });
      setAttemptId(data.data?.attemptId || data.attemptId);
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    if (!otpCode.trim()) { setError('Please enter the OTP code'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/api/public/guest/checkin/verify-otp`, {
        attemptId,
        otpCode: otpCode.trim(),
      });
      setCheckinData(data.data || data);
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/api/public/guest/checkin/request-otp`, {
        eventId,
        email,
        guestName: guestName || undefined,
      });
      setAttemptId(data.data?.attemptId || data.attemptId);
      setOtpCode('');
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F4C5C] to-[#0a3340] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F4C5C] px-6 py-5 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl">🎉</span>
          </div>
          <h1 className="text-white font-bold text-xl">Event Check-in</h1>
          <p className="text-white/70 text-sm mt-1">Powered by Plani</p>
        </div>

        <div className="px-6 py-6">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-[#0F4C5C] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 max-w-8 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Email form */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <h2 className="text-gray-800 font-semibold text-lg mb-1">Enter your details</h2>
                <p className="text-gray-500 text-sm">We'll send a verification code to your email.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your name (optional)</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent"
                />
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F4C5C] text-white rounded-lg py-3 font-semibold text-sm hover:bg-[#0a3340] disabled:opacity-60 transition-colors"
              >
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
            </form>
          )}

          {/* Step 2: OTP form */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <h2 className="text-gray-800 font-semibold text-lg mb-1">Enter your code</h2>
                <p className="text-gray-500 text-sm">We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent"
                />
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full bg-[#0F4C5C] text-white rounded-lg py-3 font-semibold text-sm hover:bg-[#0a3340] disabled:opacity-60 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Check in'}
              </button>

              <div className="text-center">
                <p className="text-gray-500 text-sm">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[#0F4C5C] text-sm font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setOtpCode(''); }}
                className="w-full text-gray-500 text-sm hover:text-gray-700"
              >
                ← Change email
              </button>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✅</span>
              </div>
              <div>
                <h2 className="text-gray-800 font-bold text-xl mb-1">You're checked in!</h2>
                {checkinData?.guestName && (
                  <p className="text-gray-600">Welcome, <span className="font-semibold">{checkinData.guestName}</span>!</p>
                )}
                {checkinData?.eventName && (
                  <p className="text-gray-500 text-sm mt-2">Enjoy <span className="font-medium">{checkinData.eventName}</span></p>
                )}
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-3 text-sm text-green-700">
                Your check-in has been recorded. Have a wonderful time!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
