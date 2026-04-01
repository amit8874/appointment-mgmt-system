import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    TrendingUp, 
    PieChart, 
    Package, 
    ShoppingCart, 
    DollarSign,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Info
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS = {
    'completed': '#10b981',
    'pending': '#f59e0b',
    'processing': '#6366f1',
    'cancelled': '#ef4444',
    'paid': '#10b981',
    'shipped': '#8b5cf6',
    'ready': '#06b6d4',
    'accepted': '#3b82f6',
    'quoted': '#6366f1'
};

const PharmacyAnalysis = () => {
    const [data, setData] = useState({
        revenueTrend: [],
        statusDistribution: [],
        topProducts: [],
        inventorySummary: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const result = await pharmacyApi.getAnalytics();
            setData(result);
        } catch (err) {
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = data.revenueTrend.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalOrders = data.revenueTrend.reduce((acc, curr) => acc + curr.orders, 0);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <motion.div 
            className="space-y-8 pb-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-indigo-600" size={32} />
                        Performance Analysis
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gaining insights from your pharmacy data</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <Calendar size={18} className="text-slate-400" />
                    <span className="text-sm font-black text-slate-600">Last 30 Days</span>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'indigo' },
                    { label: 'Total Volume', value: totalOrders, icon: ShoppingCart, color: 'emerald' },
                    { label: 'Active Products', value: data.inventorySummary.reduce((a,c) => a+c.value, 0), icon: Package, color: 'orange' }
                ].map((stat, idx) => (
                    <motion.div 
                        key={idx}
                        variants={itemVariants}
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-5 group"
                    >
                        <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900 leading-tight">{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend Chart */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[450px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Revenue Trend</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily earnings overview</p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revenueTrend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="day" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                    }}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    tickFormatter={(val) => `₹${val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '20px', 
                                        border: 'none', 
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        padding: '12px' 
                                    }}
                                    itemStyle={{ fontWeight: 900, color: '#6366f1' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#6366f1" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Order Status Distribution */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[450px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Order Status</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fulfillment breakdown</p>
                        </div>
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                            <PieChart size={20} />
                        </div>
                    </div>
                    <div className="flex-1 flex items-center min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={data.statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.statusDistribution.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={STATUS_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} 
                                            className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{value}</span>}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Top Products Bar Chart */}
                <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Top Medications</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Most sold items by volume</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Package size={20} />
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={100}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar 
                                    dataKey="quantity" 
                                    fill="#6366f1" 
                                    radius={[0, 10, 10, 0]}
                                    barSize={24}
                                >
                                    {data.topProducts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Inventory Health Summary */}
                <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Inventory Health</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock availability status</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={data.inventorySummary}
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#10b981" /> {/* Healthy */}
                                        <Cell fill="#f59e0b" /> {/* Low Stock */}
                                        <Cell fill="#ef4444" /> {/* Out of Stock */}
                                    </Pie>
                                    <Tooltip />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 mt-4">
                            {data.inventorySummary.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                            item.name === 'Healthy' ? 'bg-emerald-500' :
                                            item.name === 'Low Stock' ? 'bg-orange-500' : 'bg-red-500'
                                        }`} />
                                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{item.name}</span>
                                    </div>
                                    <span className="text-lg font-black text-slate-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
            
            {/* Insights Banner */}
            <motion.div variants={itemVariants} className="bg-indigo-600 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                    <Info size={120} />
                </div>
                <div className="z-10 relative">
                    <h3 className="text-2xl font-black tracking-tight mb-2">Automated Insights</h3>
                    <p className="text-indigo-100 font-medium max-w-md">Your revenue has grown by <span className="font-black text-white underline decoration-wavy">12%</span> compared to last month. Consider restocking <span className="font-black text-white underline decoration-wavy">Paracetamol</span> to meet upcoming demand.</p>
                </div>
                <button 
                  onClick={() => fetchAnalytics()}
                  className="z-10 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all shadow-xl"
                >
                    Refresh Data
                </button>
            </motion.div>
        </motion.div>
    );
};

export default PharmacyAnalysis;
