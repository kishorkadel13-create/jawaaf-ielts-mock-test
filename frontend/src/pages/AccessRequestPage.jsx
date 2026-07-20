import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../services/api.js';
import { Award, ShieldAlert, ShieldCheck, ArrowLeft, Clock, Zap } from 'lucide-react';

export default function AccessRequestPage() {
  const { profile, updateProfileAccess } = useAuthStore();
  const [requestStatus, setRequestStatus] = useState(null); // 'pending' | 'approved' | 'rejected' | null
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequestStatus = async () => {
    try {
      setLoading(true);
      // Fetch user access requests from API
      const { data } = await api.get('/access/request/status').catch(() => ({ data: null }));
      if (data) {
        setRequestStatus(data.status);
        if (data.status === 'approved') {
          updateProfileAccess(true);
        }
      }
      setLoading(false);
    } catch (err) {
      console.warn('Access status check warning:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestStatus();
  }, []);

  const handleRequestAccess = async () => {
    try {
      setSubmitting(true);
      const { data } = await api.post('/access/request');
      setRequestStatus(data.request.status);
      setSubmitting(false);
    } catch (err) {
      console.error('Request premium access failed:', err);
      alert(err.message || 'Failed to submit request.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-2xl mx-auto w-full justify-center">
      <div className="mb-8 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <span className="text-xs text-slate-500 font-medium">Jawaaf IELTS Lab</span>
      </div>

      <div className="glass-card p-8 border-brand-500/10 shadow-brand-500/5 relative overflow-hidden">
        {/* Decorative Radial Background */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-500/5 rounded-full blur-2xl"></div>

        <div className="text-center">
          <Zap className="h-12 w-12 text-brand-400 mx-auto mb-4 animate-bounce" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-white font-serif">Unlock Premium Access</h1>
          <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            Get complete access to all full-length Academic IELTS Listening and Reading mock tests, detailed band analytics, and review platforms.
          </p>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-brand-500 rounded-full animate-spin"></div>
            </div>
          ) : profile?.has_full_access || requestStatus === 'approved' ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center justify-center gap-2.5 max-w-md mx-auto">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <span className="font-bold">Premium Subscription Active</span>
            </div>
          ) : requestStatus === 'pending' ? (
            <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-xl max-w-md mx-auto flex flex-col items-center gap-2">
              <Clock className="h-6 w-6 animate-pulse" />
              <span className="font-bold">Request Pending Review</span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Our administrators are currently reviewing your account access request. You will gain full access immediately upon approval.
              </p>
            </div>
          ) : requestStatus === 'rejected' ? (
            <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl max-w-md mx-auto flex flex-col items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              <span className="font-bold">Request Rejected</span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Your request for full premium access was declined. Please contact support or your administrator.
              </p>
              <button 
                onClick={handleRequestAccess}
                disabled={submitting}
                className="mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                Submit New Request
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="mb-6 grid grid-cols-2 gap-4 text-left text-xs text-slate-400">
                <div className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>15+ Premium Mock Tests</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Auto IELTS Band Scoring</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Interactive Review Sheet</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Autosave & Resume CBT</span>
                </div>
              </div>

              <button
                onClick={handleRequestAccess}
                disabled={submitting}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting request...' : 'Request Full Access Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
