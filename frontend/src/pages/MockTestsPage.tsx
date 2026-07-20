import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Award, BookOpen, Headphones, Lock, ShieldAlert, ArrowLeft, Play, ArrowRight, Clock, Info } from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  description: string;
  type: string;
  duration: number;
  is_locked: boolean;
  is_demo: boolean;
}

export default function MockTestsPage() {
  const { profile } = useAuthStore();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/tests');
        setTests(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load tests:', err);
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleStartTest = async (testId: string) => {
    try {
      setStartingTestId(testId);
      const { data } = await api.post('/attempts/start', { mock_test_id: testId });
      
      // Navigate to the beautiful full-screen computer-based mock exam interface
      navigate(`/attempts/${data.attempt.id}/exam`);
    } catch (err: any) {
      console.error('Failed to start test attempt:', err);
      alert(err.response?.data?.error || err.message || 'Failed to start exam. Check premium access.');
      setStartingTestId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 text-slate-500 hover:text-[#1E3A6E] transition-colors text-[14px] font-bold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[12px] text-slate-500 font-bold uppercase tracking-wider">Jawaaf Testing Platform</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 md:p-12 w-full">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-[32px] md:text-[40px] font-black text-[#05162E] tracking-tight leading-tight">IELTS Mock Exams</h1>
            <p className="text-[15px] text-slate-500 mt-2">Select a reading or listening CBT set to begin practicing under exam conditions.</p>
          </div>
          
          {!profile?.has_full_access && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 max-w-md shadow-sm">
              <Lock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-800 leading-relaxed font-medium">
                Premium tests are locked. <Link to="/premium" className="font-bold underline hover:text-amber-900">Request full premium access</Link> to unlock our entire library. Free demos are always available.
              </p>
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1E3A6E] rounded-full animate-spin"></div>
            <p className="text-slate-400 text-[14px] font-bold">Loading test library...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">No Mock Tests Available</h3>
            <p className="text-slate-500 mt-2 text-[15px]">There are currently no mock tests available in the system. Please check back later or contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map(test => (
              <div 
                key={test.id} 
                className={`bg-white rounded-2xl border ${test.is_locked ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1'} flex flex-col relative transition-all duration-300`}
              >
                
                {/* Colored Top Bar */}
                <div className={`h-2 w-full rounded-t-2xl ${test.type === 'reading' ? 'bg-[#1E3A6E]' : 'bg-[#EE6055]'}`}></div>

                <div className="p-6 flex flex-col flex-1">
                  
                  {/* Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${test.type === 'reading' ? 'bg-[#EFF4FB] text-[#1E3A6E]' : 'bg-[#EE6055]/10 text-[#EE6055]'}`}>
                      {test.type || 'Reading'}
                    </span>
                    
                    {test.is_locked ? (
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-500 text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    ) : test.is_demo ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                        Free Demo
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-[18px] font-black text-[#05162E] leading-snug mb-2">{test.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed flex-1">{test.description || 'Simulate official British Council IELTS exam requirements.'}</p>
                  
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4 text-[12px] font-bold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {test.duration || 60} min
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Info className="h-4 w-4" /> 40 Qs
                      </div>
                    </div>

                    {test.is_locked ? (
                      <Link 
                        to="/access-request" 
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        Unlock Test <Lock className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button 
                        disabled={startingTestId === test.id}
                        onClick={() => handleStartTest(test.id)}
                        className={`w-full py-3 text-white text-[13px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${test.type === 'reading' ? 'bg-[#1E3A6E] hover:bg-[#162d57]' : 'bg-[#EE6055] hover:bg-[#d45248]'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {startingTestId === test.id ? (
                          <>Starting Exam...</>
                        ) : (
                          <>Start Exam <Play className="h-3 w-3 fill-current" /></>
                        )}
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
