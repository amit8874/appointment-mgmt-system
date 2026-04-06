import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, Users, Calendar, AlertTriangle, Lightbulb, RefreshCw, ChevronRight, BarChart3 } from 'lucide-react';
import { analyticsApi } from '../../services/api';
import { toast } from 'react-toastify';

const IntelligenceHub = () => {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState("");
  const [rawStats, setRawStats] = useState(null);
  const [timeRange, setTimeRange] = useState(90);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getPredictiveInsights(timeRange);
      setInsights(data.insights);
      setRawStats(data.rawStats);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      toast.error("Could not load AI insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [timeRange]);

  const renderInsightItem = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      if (line.startsWith('**') || line.match(/^\d\./)) {
        return (
          <div key={index} className="mb-4 bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
            <div className="flex gap-3">
              <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg h-fit">
                <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                {line.replace(/^\d\.\s+/, '')}
              </p>
            </div>
          </div>
        );
      }
      return null;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-8 space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 flex items-center gap-3">
            <Brain className="w-10 h-10 text-blue-600" /> Slotify Intelligence
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">AI-powered forecasts and strategic clinic insights.</p>
        </div>

        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={180}>Last 6 Months</option>
          </select>
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Insights Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6" /> Strategic Forecast
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-10 h-10 animate-spin opacity-50" />
                <span className="ml-3 font-medium">Analyzing Clinic Patterns...</span>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                {renderInsightItem(insights)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-purple-600" /> Peak Day Distribution
                </h4>
                <div className="space-y-3">
                  {rawStats?.peakDays.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-10 text-xs font-bold text-gray-500">{d.day}</span>
                      <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.count / Math.max(...rawStats.peakDays.map(x => x.count))) * 100}%` }}
                          className="h-full bg-purple-500"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{d.count}</span>
                    </div>
                  ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-emerald-600" /> Revenue Growth
                </h4>
                <div className="space-y-4">
                  {rawStats?.revenueStats.map((r, i) => (
                    <div key={i} className="flex justify-between items-end gap-2">
                       <div className="text-xs font-bold text-gray-500">{r._id}</div>
                       <div className="text-sm font-extrabold text-gray-900 dark:text-white">₹{r.total.toLocaleString()}</div>
                    </div>
                  ))}
                  {(!rawStats?.revenueStats || rawStats.revenueStats.length === 0) && (
                    <p className="text-gray-400 text-sm italic">Insufficient billing data for projection.</p>
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* Actionable Side Panel */}
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
            <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5" /> No-Show Watch
            </h4>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-amber-100 dark:border-amber-900 shadow-sm">
                <div className="text-2xl font-black text-amber-600">
                  {((rawStats?.appointmentStats.find(s => s._id === 'cancelled')?.count || 0) / 
                    (rawStats?.appointmentStats.reduce((acc, curr) => acc + curr.count, 0) || 1) * 100).toFixed(1)}%
                </div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Cancellation Rate</div>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                AI suggests sending additional WhatsApp reminders 4 hours before appointments on your peak days.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-24 h-24" />
             </div>
             <h4 className="font-bold text-gray-900 dark:text-white mb-2">Patient Loyalty</h4>
             <div className="text-3xl font-black text-blue-600">{rawStats?.totalPatients || 0}</div>
             <div className="text-xs font-bold text-gray-500 uppercase">Total Retained Patients</div>
             <div className="mt-4 flex items-center text-xs font-bold text-blue-500 cursor-pointer hover:underline">
               View detailed demographics <ChevronRight className="w-3 h-3" />
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default IntelligenceHub;
