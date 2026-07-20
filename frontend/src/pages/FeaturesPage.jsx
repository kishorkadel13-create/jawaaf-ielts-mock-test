import React from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle, ArrowLeft, Timer, Layers, RefreshCw, Lock } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back Home
        </Link>
        <span className="text-xs text-slate-500 font-medium">Jawaaf IELTS Lab Platform</span>
      </div>

      <div className="text-center md:text-left mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-serif">
          Engineered for <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-blue-300">Academic Excellence</span>
        </h1>
        <p className="mt-4 text-slate-400 max-w-2xl text-base md:text-lg leading-relaxed">
          Discover the architecture and advanced components driving the Jawaaf IELTS Lab mock exam environment.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Exam simulation features */}
        <div className="glass-card p-8 border-slate-800 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-white border-b border-white/5 pb-3">CBT Simulation Features</h2>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Sticky Timer & Auto-Submit</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Integrated header counts down the minutes. If the clock reaches 00:00, answers are synced, and the test submits automatically.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">10s Background Autosave</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Keeps your answers securely synced in our database. Never lose progress to server drops or accidentally closed tabs.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Offline Resilience Backup</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Saves progress state to localStorage in real time. Can withstand internet drops, reloading, and power failures safely.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic question engine */}
        <div className="glass-card p-8 border-slate-800 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-white border-b border-white/5 pb-3">Dynamic Question Engine</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            The heart of the Jawaaf platform is a dynamic renderer capable of executing standard IELTS computer-based formats from DB payloads:
          </p>

          <ul className="grid grid-cols-2 gap-3 text-xs text-slate-300 font-medium">
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-brand-400" /> Fill in Blanks</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-brand-400" /> Multiple Choice</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-brand-400" /> True/False/Not Given</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-brand-400" /> Yes/No/Not Given</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-brand-400" /> Dropdown Summaries</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-brand-400" /> Item Matching</li>
          </ul>

          <div className="mt-auto p-4 bg-brand-500/5 border border-brand-500/15 rounded-xl flex items-center gap-3">
            <Lock className="h-5 w-5 text-brand-400 shrink-0" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Freemium Limit</strong>: Every user receives 1 free demo mock test immediately. Premium mock tests remain locked until full access is requested and approved by the admin.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link to="/register" className="inline-block px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/20 transition-all">
          Create Free Student Account Now
        </Link>
      </div>
    </div>
  );
}
