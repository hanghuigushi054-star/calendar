import { useState, useEffect } from 'react';
import { Calendar, Building2, Flag, ArrowRight, Loader2, AlertCircle, Info, Image as ImageIcon, Save, Trash2, List, Calendar as CalendarIcon, X, CheckCircle, Circle, GraduationCap, FileText, User, Key, ExternalLink, Edit, Eye, EyeOff } from 'lucide-react';
import { analyzeSchedule, ImageData } from './services/geminiService';
import { AnalysisResult, ScheduleItem } from './types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function App() {
  // Setup State
  const [graduationYear, setGraduationYear] = useState<string>('');
  const [tempGraduationYear, setTempGraduationYear] = useState<string>('');
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);

  // Tabs: 'input' | 'calendar' | 'profile'
  const [activeTab, setActiveTab] = useState<'input' | 'calendar' | 'profile'>('input');
  
  // Data State
  const [savedSchedules, setSavedSchedules] = useState<AnalysisResult[]>([]);
  const [profileData, setProfileData] = useState({
    selfPr: '',
    gakuchika: '',
    motivation: '',
    strengths: '',
    weaknesses: '',
  });
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  
  // Form State
  const [targetDate, setTargetDate] = useState<string>('');
  const [emailText, setEmailText] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Analysis State
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data Modal State
  const [editingCompany, setEditingCompany] = useState<AnalysisResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateTasks, setSelectedDateTasks] = useState<{task: ScheduleItem, company: string, isPast: boolean, scheduleId: string, companyData: AnalysisResult}[] | null>(null);

  // Load saved data on init
  useEffect(() => {
    try {
      const year = localStorage.getItem('graduationYear');
      if (year) {
        setGraduationYear(year);
        setIsSetupComplete(true);
      }
      
      const data = localStorage.getItem('schedules');
      if (data) {
        setSavedSchedules(JSON.parse(data));
      }
      
      const pData = localStorage.getItem('profileData');
      if (pData) {
        setProfileData(JSON.parse(pData));
      }
    } catch (e) {
      console.error("Failed to load saved schedules", e);
    }
  }, []);

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempGraduationYear) return;
    setGraduationYear(tempGraduationYear);
    setIsSetupComplete(true);
    localStorage.setItem('graduationYear', tempGraduationYear);
  };

  const handleProfileChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setIsProfileSaved(false);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('profileData', JSON.stringify(profileData));
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate || (!emailText && !imageFile)) {
      setError('目標日と、「テキストまたは画像」のどちらかを入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let imageData: ImageData | undefined;
      
      if (imageFile) {
        // Prepare base64
        const mType = imageFile.type;
        const b64 = imagePreview?.split(',')[1];
        if (b64) {
             imageData = { mimeType: mType, data: b64 };
        }
      }

      const data = await analyzeSchedule(emailText, targetDate, graduationYear, imageData);
      
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'スケジュールの作成中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveResult = () => {
    if (!result) return;
    
    // Add unique ID and timestamp
    const recordToSave: AnalysisResult = {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      schedule: result.schedule.map(s => ({...s, id: Math.random().toString(36).substr(2, 9), isCompleted: false})),
      status: '準備中',
      myPageUrl: '',
      loginId: '',
      password: ''
    };
    
    const updated = [recordToSave, ...savedSchedules];
    setSavedSchedules(updated);
    localStorage.setItem('schedules', JSON.stringify(updated));
    
    // Reset and go to calendar
    setResult(null);
    setEmailText('');
    removeImage();
    setActiveTab('calendar');
  };

  const getStatusBadge = (status?: string) => {
    switch(status) {
      case '準備中': return 'bg-slate-100 text-slate-600 border-slate-200';
      case '書類選考中': return 'bg-blue-50 text-blue-600 border-blue-200';
      case '面接選考中': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case '内定': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case '終了': return 'bg-slate-100 text-slate-400 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const saveCompanyInfo = (updatedCompany: AnalysisResult) => {
    const updated = savedSchedules.map(c => c.id === updatedCompany.id ? updatedCompany : c);
    setSavedSchedules(updated);
    localStorage.setItem('schedules', JSON.stringify(updated));
    setEditingCompany(null);
  };

  const deleteSchedule = (id: string) => {
    const updated = savedSchedules.filter(s => s.id !== id);
    setSavedSchedules(updated);
    localStorage.setItem('schedules', JSON.stringify(updated));
  };

  const clearAllData = () => {
    if (confirm("すべての保存データを削除しますか？")) {
      setSavedSchedules([]);
      localStorage.removeItem('schedules');
    }
  };

  const toggleTaskCompletion = (scheduleId: string, taskId: string) => {
    const updated = savedSchedules.map(ss => {
      if (ss.id === scheduleId) {
        return {
          ...ss,
          schedule: ss.schedule.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
        };
      }
      return ss;
    });
    setSavedSchedules(updated);
    localStorage.setItem('schedules', JSON.stringify(updated));
    
    // Update selectedDateTasks if open
    if (selectedDateTasks) {
      setSelectedDateTasks(selectedDateTasks.map(t => {
        if (t.scheduleId === scheduleId && t.task.id === taskId) {
          return { ...t, task: { ...t.task, isCompleted: !t.task.isCompleted } };
        }
        return t;
      }));
    }
  };

  const updateTaskDate = (scheduleId: string, taskId: string, newDate: string) => {
    if (!newDate) return;
    const updated = savedSchedules.map(ss => {
      if (ss.id === scheduleId) {
        return {
          ...ss,
          schedule: ss.schedule.map(t => t.id === taskId ? { ...t, date: newDate } : t)
        };
      }
      return ss;
    });
    setSavedSchedules(updated);
    localStorage.setItem('schedules', JSON.stringify(updated));
    
    if (selectedDateTasks) {
      setSelectedDateTasks(selectedDateTasks.map(t => {
        if (t.scheduleId === scheduleId && t.task.id === taskId) {
          return { ...t, task: { ...t.task, date: newDate } };
        }
        return t;
      }));
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const dateFormat = "d";
  const days = eachDayOfInterval({
      start: startDate,
      end: endDate
  });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Aggregate all tasks
  const allTasks = savedSchedules.flatMap(s => 
    s.schedule.map(item => ({
      task: item,
      company: s.companyName,
      scheduleId: s.id!,
      companyData: s
    }))
  );

  const getTasksForDay = (day: Date) => {
    return allTasks.filter(t => {
      try {
        const itemDate = parseISO(t.task.date);
        return isSameDay(itemDate, day);
      } catch (e) {
        return false;
      }
    });
  };

  if (!isSetupComplete) {
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear + i);

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">何年卒の就活ですか？</h1>
          <p className="text-slate-500 text-center text-sm mb-8">
            逆算スケジュールの精度を上げるために、卒業年（就職年）を教えてください。
          </p>
          <form onSubmit={handleSetup} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {yearOptions.map(year => (
                  <label key={year} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${tempGraduationYear === String(year) ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                    <input type="radio" value={String(year)} checked={tempGraduationYear === String(year)} onChange={() => setTempGraduationYear(String(year))} className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600" />
                    <span className="font-bold text-slate-700 text-sm">{year}年卒 ({String(year).slice(-2)}卒)</span>
                  </label>
                ))}
              </div>
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${!yearOptions.includes(Number(tempGraduationYear)) && tempGraduationYear !== '' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                   <input type="radio" value="other" checked={!yearOptions.includes(Number(tempGraduationYear)) && tempGraduationYear !== ''} onChange={(e) => { if(e.target.checked) setTempGraduationYear(String(currentYear + 4)) }} className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600" />
                   <span className="font-bold text-slate-700 text-sm">その他</span>
                   {(!yearOptions.includes(Number(tempGraduationYear)) && tempGraduationYear !== '') && (
                     <input type="number" min="1990" max="2100" value={tempGraduationYear} onChange={(e) => setTempGraduationYear(e.target.value)} className="w-24 ml-2 px-2 py-1 border rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500" autoFocus/>
                   )}
              </label>
            </div>
            <button
              type="submit"
              disabled={!tempGraduationYear}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 px-4 rounded-xl transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
            >
              はじめる
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              就活逆算カレンダー
            </h1>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <Info className="w-4 h-4" />
            データはブラウザに安全に保存されます
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-slate-100 overflow-x-auto text-nowrap">
           <button 
             onClick={() => setActiveTab('input')}
             className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
           >
             <List className="w-4 h-4" />
             解析・登録
           </button>
           <button 
             onClick={() => setActiveTab('calendar')}
             className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
           >
             <CalendarIcon className="w-4 h-4" />
             カレンダー履歴
           </button>
           <button 
             onClick={() => setActiveTab('profile')}
             className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
           >
             <User className="w-4 h-4" />
             ES・プロフィール
           </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- INPUT TAB --- */}
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form */}
            <div className={`lg:col-span-5 space-y-6 block`}>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6 font-sans">スケジュール解析</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="targetDate" className="block text-sm font-medium text-slate-700 mb-2">
                      前倒し目標日
                    </label>
                    <input
                      type="date"
                      id="targetDate"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                      募集要項・案内 (テキスト または 画像)
                    </label>
                    
                    {/* Image Upload Area */}
                    {!imagePreview ? (
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative cursor-pointer group">
                        <input 
                           type="file" 
                           accept="image/*" 
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                           onChange={handleImageUpload}
                        />
                        <div className="bg-indigo-50 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-6 h-6 text-indigo-500" />
                        </div>
                        <p className="text-sm font-medium text-indigo-600 mb-1">画像をアップロード</p>
                        <p className="text-xs text-slate-500">スクリーンショットや写真をドロップ</p>
                      </div>
                    ) : (
                      <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                         <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain" />
                         <button 
                           type="button" 
                           onClick={removeImage}
                           className="absolute top-2 right-2 bg-slate-900/60 hover:bg-slate-900 text-white p-1.5 rounded-full transition-colors z-20"
                         >
                           <X className="w-4 h-4" />
                         </button>
                         <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/60 to-transparent p-3 shadow-sm">
                           <p className="text-white text-xs font-medium flex items-center gap-2 drop-shadow-md">
                             <ImageIcon className="w-3 h-3" /> 画像をセットしました
                           </p>
                         </div>
                      </div>
                    )}

                    <div className="relative flex items-center py-2">
                         <div className="flex-grow border-t border-slate-200"></div>
                         <span className="flex-shrink-0 mx-4 text-slate-400 text-xs text-center font-medium">または</span>
                         <div className="flex-grow border-t border-slate-200"></div>
                     </div>

                    {/* Text Area */}
                    <textarea
                      id="emailText"
                      value={emailText}
                      onChange={(e) => setEmailText(e.target.value)}
                      rows={5}
                      placeholder="メール本文などを貼り付け..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-sm leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm hover:shadow"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        解析・スケジュール生成中...
                      </>
                    ) : (
                      <>
                        スケジュールを逆算する
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-7">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              {!result && !isLoading && !error && (
                <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                  <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <List className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">結果がここに表示されます</h3>
                  <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                    画像やテキストからスケジュールを解析し、カレンダーへ保存する準備を行います。
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="h-full min-h-[400px] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-8">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <p className="text-slate-600 font-medium">解析・生成しています...</p>
                  <p className="text-slate-400 text-sm mt-2">※画像が含まれる場合は少し時間がかかります</p>
                </div>
              )}

              {result && !isLoading && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
                  
                  <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-3 pl-4 border-l-4 border-indigo-500">{result.companyName || '不明な企業'}</h2>
                      <div className="flex flex-wrap gap-2 lg:gap-4 pl-4">
                        <span className="text-sm px-3 py-1 bg-red-50 text-red-700 font-medium rounded-full border border-red-100 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5"/> 最終: {result.finalDeadline}</span>
                        <span className="text-sm px-3 py-1 bg-emerald-50 text-emerald-700 font-medium rounded-full border border-emerald-100 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5"/> 目標: {result.targetDate}</span>
                      </div>
                    </div>
                  </div>

                  {result.notes && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-8 flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{result.notes}</p>
                    </div>
                  )}

                  {/* Actions Timeline */}
                  <div className="space-y-4 mb-8">
                    {result.schedule.map((item, index) => (
                      <div key={index} className="flex gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                         <div className="w-24 sm:w-28 flex-shrink-0 pt-1">
                           <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded inline-block text-center">{item.date}</span>
                         </div>
                         <div>
                            <p className="font-bold text-slate-900">{item.task}</p>
                            <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* Save Action */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                     <button
                        onClick={() => setResult(null)}
                        className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto text-center"
                     >
                       キャンセル
                     </button>
                     <button
                        onClick={handleSaveResult}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-md hover:shadow-lg w-full sm:w-auto"
                     >
                        <Save className="w-5 h-5" />
                        このスケジュールをカレンダーに保存
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- CALENDAR/HISTORY TAB --- */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 fade-in animate-in">
            
            {/* Sidebar (List of saved configs) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-4 h-4"/> 進行中の選考</h3>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{savedSchedules.length}件</span>
                 </div>
                 
                 {savedSchedules.length === 0 ? (
                    <p className="text-sm text-slate-500 p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">登録された選考はありません</p>
                 ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {savedSchedules.map(sched => (
                         <div key={sched.id} className="p-3 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors group relative bg-white shadow-sm flex flex-col gap-2">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-all">
                               <button 
                                  onClick={() => { setEditingCompany(sched); setShowPassword(false); }}
                                  className="p-1.5 bg-white rounded-md text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all border border-slate-100 shadow-sm"
                                  title="編集・ログイン情報"
                               >
                                  <Edit className="w-3.5 h-3.5" />
                               </button>
                               <button 
                                  onClick={() => deleteSchedule(sched.id!)}
                                  className="p-1.5 bg-white rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100 shadow-sm"
                                  title="削除"
                               >
                                  <Trash2 className="w-3.5 h-3.5" />
                               </button>
                            </div>
                            
                            <div className="pr-16">
                               <h4 className="font-bold text-sm text-slate-900 leading-tight line-clamp-2">{sched.companyName}</h4>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                               <span className={`text-[10px] px-2 py-0.5 rounded border font-bold whitespace-nowrap ${getStatusBadge(sched.status)}`}>{sched.status || '準備中'}</span>
                            </div>
                            {sched.myPageUrl && (
                                <a href={sched.myPageUrl.startsWith('http') ? sched.myPageUrl : `https://${sched.myPageUrl}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-600 flex items-center gap-1 font-medium mt-0.5 w-max" title="マイページへ">
                                    <ExternalLink className="w-3 h-3"/> マイページ
                                </a>
                            )}
                         </div>
                       ))}
                    </div>
                 )}
                 {savedSchedules.length > 0 && (
                   <button onClick={clearAllData} className="w-full mt-4 text-xs text-red-500 font-medium hover:bg-red-50 py-2 rounded-lg transition-colors">
                     すべてのデータを削除
                   </button>
                 )}
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="lg:col-span-3 pb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                
                {/* Calendar Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 gap-4">
                   <div className="flex items-center gap-4">
                     <h2 className="text-xl font-bold font-mono text-slate-800">
                        {format(currentDate, 'yyyy')}年 {format(currentDate, 'MM')}月
                     </h2>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={prevMonth} className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
                         <ArrowRight className="w-4 h-4 rotate-180" />
                      </button>
                      <button onClick={goToday} className="px-3 py-2 text-sm font-medium border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-sm">
                         今日
                      </button>
                      <button onClick={nextMonth} className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
                         <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                {/* Days of Week */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                    <div key={day} className={`py-2 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 bg-slate-200 gap-px border-b border-slate-200">
                   {days.map((day, i) => {
                     const isCurrentMonth = isSameMonth(day, monthStart);
                     const isDayToday = isToday(day);
                     const dayTasks = getTasksForDay(day);

                     return (
                       <div 
                         key={day.toISOString()} 
                         onClick={() => dayTasks.length > 0 && setSelectedDateTasks(dayTasks.map(t => ({...t, isPast: day < new Date(new Date().setHours(0,0,0,0))} )))}
                         className={`min-h-[100px] bg-white p-2 transition-colors relative ${!isCurrentMonth ? 'bg-slate-50 opacity-40' : ''} ${dayTasks.length > 0 ? 'cursor-pointer hover:bg-indigo-50/50' : ''}`}
                       >
                         <div className="flex justify-between items-start">
                           <span className={`text-xs font-bold w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-full ${isDayToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}`}>
                             {format(day, dateFormat)}
                           </span>
                           {dayTasks.length > 0 && (
                             <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
                               {dayTasks.length}件
                             </span>
                           )}
                         </div>

                         {/* Task Indicators */}
                         <div className="mt-2 space-y-1">
                           {dayTasks.slice(0, 3).map((taskData, idx) => {
                             let statusColor = "bg-indigo-400";
                             if (taskData.companyData.status === '書類選考中') statusColor = "bg-blue-400";
                             else if (taskData.companyData.status === '面接選考中') statusColor = "bg-purple-400";
                             else if (taskData.companyData.status === '内定') statusColor = "bg-emerald-400";
                             else if (taskData.companyData.status === '終了') statusColor = "bg-slate-400";

                             return (
                               <div key={idx} className={`flex items-center gap-1 overflow-hidden text-[10px] sm:text-xs font-medium px-1.5 py-0.5 border rounded leading-tight ${taskData.task.isCompleted ? 'bg-slate-100 text-slate-400 border-transparent line-through' : 'bg-white text-slate-700 border-slate-200'}`}>
                                 {!taskData.task.isCompleted && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`} />}
                                 <span className="truncate">{taskData.company} - {taskData.task.task}</span>
                               </div>
                             );
                           })}
                           {dayTasks.length > 3 && (
                             <div className="text-[10px] text-slate-400 font-medium pl-1 mt-1">他 {dayTasks.length - 3}件...</div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto fade-in animate-in">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                 <div>
                   <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                     <FileText className="w-6 h-6 text-indigo-500" />
                     ES備忘録・自己PR
                   </h2>
                   <p className="text-sm text-slate-500 mt-1">エントリーシート作成に必要な情報をまとめておきましょう</p>
                 </div>
                 <button
                   onClick={handleProfileSave}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 flex-shrink-0"
                 >
                   <Save className="w-4 h-4" />
                   保存する
                 </button>
               </div>

               {isProfileSaved && (
                 <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                   <div className="flex items-center gap-2">
                     <CheckCircle className="w-5 h-5 text-emerald-500" />
                     <p className="text-sm font-medium">プロフィールデータを保存しました</p>
                   </div>
                   <button onClick={() => setIsProfileSaved(false)} className="text-emerald-500 hover:text-emerald-700">
                     <X className="w-4 h-4" />
                   </button>
                 </div>
               )}

               <div className="space-y-8">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">自己PR</label>
                   <textarea
                     value={profileData.selfPr}
                     onChange={(e) => handleProfileChange('selfPr', e.target.value)}
                     className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed min-h-[120px] resize-y"
                     placeholder="私の強みは〇〇です..."
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">ガクチカ (学生時代に力を入れたこと)</label>
                   <textarea
                     value={profileData.gakuchika}
                     onChange={(e) => handleProfileChange('gakuchika', e.target.value)}
                     className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed min-h-[120px] resize-y"
                     placeholder="大学時代、〇〇サークルの代表として..."
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">長所と短所</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <textarea
                       value={profileData.strengths}
                       onChange={(e) => handleProfileChange('strengths', e.target.value)}
                       className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed min-h-[80px] resize-y"
                       placeholder="長所: 計画性がある..."
                     />
                     <textarea
                       value={profileData.weaknesses}
                       onChange={(e) => handleProfileChange('weaknesses', e.target.value)}
                       className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed min-h-[80px] resize-y"
                       placeholder="短所: 慎重すぎるところがある..."
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">志望動機など、その他のメモ</label>
                   <textarea
                     value={profileData.motivation}
                     onChange={(e) => handleProfileChange('motivation', e.target.value)}
                     className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed min-h-[120px] resize-y"
                     placeholder="IT業界を志望する理由は..."
                   />
                 </div>
               </div>
             </div>
          </div>
        )}

      </main>

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingCompany(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
               <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500"/>
                  企業情報の編集
               </h3>
               <button onClick={() => setEditingCompany(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
               </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">企業名</label>
                  <input type="text" value={editingCompany.companyName} onChange={e => setEditingCompany({...editingCompany, companyName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">選考状況</label>
                  <select value={editingCompany.status || '準備中'} onChange={e => setEditingCompany({...editingCompany, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                     <option value="準備中">準備中</option>
                     <option value="書類選考中">書類選考中</option>
                     <option value="面接選考中">面接選考中</option>
                     <option value="内定">内定</option>
                     <option value="終了">終了</option>
                  </select>
               </div>
               
               <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-4">
                   <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2 mb-2"><Key className="w-4 h-4 text-slate-400"/> ログイン情報 (マイページ)</h4>
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">URL</label>
                      <input type="url" placeholder="https://" value={editingCompany.myPageUrl || ''} onChange={e => setEditingCompany({...editingCompany, myPageUrl: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ログインＩＤ</label>
                      <input type="text" placeholder="user@example.com" value={editingCompany.loginId || ''} onChange={e => setEditingCompany({...editingCompany, loginId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">パスワード</label>
                      <div className="relative">
                          <input type={showPassword ? "text" : "password"} value={editingCompany.password || ''} onChange={e => setEditingCompany({...editingCompany, password: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                             {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>
               </div>
               
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-4 mt-6">
                   <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-slate-400"/> メモ・感想</h4>
                   
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">説明会の感想・メモ</label>
                      <textarea placeholder="人事の雰囲気が良かった..." value={editingCompany.impressionInfoSession || ''} onChange={e => setEditingCompany({...editingCompany, impressionInfoSession: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y min-h-[80px]" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ESの設問・提出した内容</label>
                      <textarea placeholder="Q: 学生時代に力を入れたこと..." value={editingCompany.impressionES || ''} onChange={e => setEditingCompany({...editingCompany, impressionES: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y min-h-[80px]" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Webテストの形式・手応え</label>
                      <textarea placeholder="玉手箱形式。言語は概ね解けた..." value={editingCompany.impressionWebTest || ''} onChange={e => setEditingCompany({...editingCompany, impressionWebTest: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y min-h-[80px]" />
                   </div>
               </div>
               
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button onClick={() => setEditingCompany(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors bg-white">
                  キャンセル
               </button>
               <button onClick={() => saveCompanyInfo(editingCompany)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm">
                  保存する
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Date Modal */}
      {selectedDateTasks && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in cursor-pointer duration-200" onClick={() => setSelectedDateTasks(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col cursor-default transform border border-slate-200" onClick={e => e.stopPropagation()}>
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                     <CalendarIcon className="w-5 h-5 text-indigo-500"/>
                     {format(parseISO(selectedDateTasks[0].task.date), 'yyyy年M月d日 (E)', { locale: ja })} のタスク
                  </h3>
                  <button onClick={() => setSelectedDateTasks(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="p-6 overflow-y-auto bg-white flex-1 space-y-4">
                  {selectedDateTasks.map((t, i) => (
                     <div key={i} className={`p-4 rounded-xl border flex gap-4 transition-all ${t.task.isCompleted ? 'bg-slate-50 border-slate-200 opacity-60' : t.isPast ? 'bg-amber-50/30 border-amber-200' : 'bg-indigo-50/30 border-indigo-100 shadow-sm'}`}>
                        <button onClick={() => toggleTaskCompletion(t.scheduleId, t.task.id!)} className="mt-1 flex-shrink-0 focus:outline-none group">
                           {t.task.isCompleted ? (
                              <CheckCircle className="w-6 h-6 text-emerald-500 transition-transform group-active:scale-95" />
                           ) : (
                              <Circle className={`w-6 h-6 transition-transform group-hover:scale-105 group-active:scale-95 ${t.isPast ? 'text-amber-400' : 'text-slate-300 hover:text-indigo-400'}`} />
                           )}
                        </button>
                        <div className="flex-1 min-w-0">
                           <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                              <div className="flex flex-wrap gap-2 items-center">
                                 <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1"><Building2 className="w-3 h-3"/> {t.company}</span>
                                 <span className={`text-[10px] px-2 py-0.5 rounded border font-bold whitespace-nowrap ${getStatusBadge(t.companyData.status)}`}>{t.companyData.status || '準備中'}</span>
                                 {!t.task.isCompleted && t.isPast && <span className="text-xs text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200">期限切れ</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="date"
                                  value={t.task.date}
                                  onChange={(e) => updateTaskDate(t.scheduleId, t.task.id!, e.target.value)}
                                  className="text-[10px] sm:text-xs text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <button 
                                  onClick={() => {
                                    setSelectedDateTasks(null);
                                    setEditingCompany(t.companyData); 
                                    setShowPassword(false);
                                  }}
                                  className="text-[10px] sm:text-xs text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 px-2 py-1 rounded transition-colors flex items-center gap-1 font-medium whitespace-nowrap"
                                >
                                  <Edit className="w-3 h-3" /> メモ
                                </button>
                              </div>
                           </div>
                           <h4 className={`font-bold leading-tight mb-1.5 text-base transition-colors ${t.task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{t.task.task}</h4>
                           <p className={`text-sm leading-relaxed ${t.task.isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>{t.task.description}</p>
                           
                           {/* Quick preview of impressions if any exist */}
                           {(t.companyData.impressionInfoSession || t.companyData.impressionES || t.companyData.impressionWebTest) && !t.task.isCompleted && (
                              <div className="mt-3 pt-3 border-t border-slate-200/60 text-ellipsis bg-white/50 p-2 rounded-lg text-[11px] sm:text-xs text-slate-600 border border-slate-100">
                                 <p className="font-bold text-slate-700 mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/> 選考メモ (抜粋)</p>
                                 <p className="line-clamp-2">
                                    {t.companyData.impressionES || t.companyData.impressionInfoSession || t.companyData.impressionWebTest}
                                 </p>
                              </div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
