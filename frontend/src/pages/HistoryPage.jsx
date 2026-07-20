import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Award, History, ArrowLeft, Calendar, FileText, CheckSquare } from 'lucide-react';

export default function HistoryPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/attempts/history');
        setAttempts(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to retrieve attempts history:', err);
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-4xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <span className="text-xs text-slate-500 font-medium">Jawaaf IELTS Lab</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-serif flex items-center gap-3">
          <History className="h-7 w-7 text-brand-400" /> Exam Attempts Log
        </h1>
        <p className="text-sm text-slate-400 mt-1">Review your past grades, band scores, and correct answers details.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
      ) : attempts.length === 0 ? (
        <div className="text-center p-12 glass-card border-slate-800">
          <History className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No Exam Records</h3>
          <p className="text-slate-400 mt-2 text-sm">You haven't completed any mock exams yet.</p>
          <Link to="/tests" className="mt-6 inline-block px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-md">
            Practice Mock Exams
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {attempts.map(item => (
            <div key={item.id} className="glass-card p-6 border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white leading-snug">{item.mock_tests?.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(item.submitted_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" /> Completed</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wide">IELTS Score</span>
                  <span className="text-2xl font-extrabold text-brand-400 block">Band {parseFloat(item.score).toFixed(1)}</span>
                </div>
                
                <Link 
                  to={`/attempts/${item.id}/result`} 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700"
                >
                  Review Answers
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
