import React, { useState, useEffect } from 'react';
import { FileImage, Upload, Trash2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import organizationApi from '../../../api/organizationApi';

const PrescriptionTemplateTab = () => {
    const [settings, setSettings] = useState({
        enabled: false,
        templateUrl: '',
        printableArea: { top: 55, left: 12, right: 12, bottom: 30 },
        fontSize: 12
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '', visible: false });
    const [filePreview, setFilePreview] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification({ message: '', type: '', visible: false }), 3000);
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await organizationApi.getPrescriptionTemplateSettings();
            if (data?.data) {
                setSettings(data.data);
            }
        } catch (error) {
            console.error('Failed to load template settings:', error);
            showNotification('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await organizationApi.updatePrescriptionTemplateSettings({
                enabled: settings.enabled,
                printableArea: settings.printableArea,
                fontSize: settings.fontSize
            });
            showNotification('Settings saved successfully');
        } catch (error) {
            showNotification('Failed to save settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Preview locally first
            const objectUrl = URL.createObjectURL(file);
            setFilePreview(objectUrl);

            const formData = new FormData();
            formData.append('image', file);
            const response = await organizationApi.uploadPrescriptionTemplate(formData);
            
            setSettings(prev => ({ ...prev, templateUrl: response.templateUrl, enabled: true }));
            showNotification('Template uploaded successfully');
        } catch (error) {
            showNotification('Failed to upload template', 'error');
            setFilePreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await organizationApi.deletePrescriptionTemplate();
            setSettings(prev => ({ ...prev, templateUrl: '', enabled: false }));
            setFilePreview(null);
            showNotification('Template removed');
        } catch (error) {
            showNotification('Failed to remove template', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMarginChange = (side, value) => {
        setSettings(prev => ({
            ...prev,
            printableArea: {
                ...prev.printableArea,
                [side]: Number(value)
            }
        }));
    };

    // Calculate preview styles (scaled down to fit UI, using mm to % conversion for visual representation)
    const renderPreviewStyle = () => {
        const { top, left, right, bottom } = settings.printableArea;
        // A4 aspect ratio 1:1.414, 210mm x 297mm
        const topPct = (top / 297) * 100;
        const bottomPct = (bottom / 297) * 100;
        const leftPct = (left / 210) * 100;
        const rightPct = (right / 210) * 100;

        return {
            top: `${topPct}%`,
            bottom: `${bottomPct}%`,
            left: `${leftPct}%`,
            right: `${rightPct}%`,
        };
    };

    const currentImage = filePreview || settings.templateUrl;

    if (loading && !settings.templateUrl && !filePreview) {
        return <div className="p-8 text-center text-slate-500">Loading...</div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Prescription Letterhead</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Full A4 Template System</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={settings.enabled}
                                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                            />
                            <div className={`block w-14 h-8 rounded-full transition-colors ${settings.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.enabled ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <span className="ml-3 text-sm font-bold text-slate-700">{settings.enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                    <button 
                        onClick={handleSave}
                        disabled={loading || uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left side: Upload & Settings */}
                <div className="space-y-8">
                    {/* Upload Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">A4 Background Template</label>
                        {!currentImage ? (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {uploading ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-slate-400 mb-3" />
                                            <p className="mb-2 text-sm text-slate-500 font-bold"><span className="text-indigo-600">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">PNG, JPG up to 5MB</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="relative w-16 h-20 bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex-shrink-0 flex items-center justify-center">
                                    <img src={currentImage} alt="Template Thumbnail" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 text-center sm:text-left min-w-0">
                                    <h4 className="text-xs font-bold text-slate-800 truncate">Background Letterhead Template</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">A4 (210 x 297 mm)</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                                        <CheckCircle size={12} /> Loaded & Active
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                                    <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                                        <Upload size={14} className="text-slate-500" /> Replace
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                    <button 
                                        onClick={handleDelete}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
                                    >
                                        <Trash2 size={14} /> Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Margins Section */}
                    <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FileImage size={16} className="text-indigo-600" />
                            Printable Area Margins (mm)
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">Set margins to avoid printing text over your letterhead headers and footers.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Top Margin (mm)</label>
                                <input 
                                    type="number" 
                                    value={settings.printableArea.top} 
                                    onChange={(e) => handleMarginChange('top', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Bottom Margin (mm)</label>
                                <input 
                                    type="number" 
                                    value={settings.printableArea.bottom} 
                                    onChange={(e) => handleMarginChange('bottom', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Left Margin (mm)</label>
                                <input 
                                    type="number" 
                                    value={settings.printableArea.left} 
                                    onChange={(e) => handleMarginChange('left', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Right Margin (mm)</label>
                                <input 
                                    type="number" 
                                    value={settings.printableArea.right} 
                                    onChange={(e) => handleMarginChange('right', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Base Font Size (px)</label>
                            <input 
                                type="number" 
                                value={settings.fontSize || 12} 
                                onChange={(e) => setSettings(prev => ({...prev, fontSize: Number(e.target.value)}))}
                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Right side: Live Preview */}
                <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 flex flex-col items-center lg:sticky lg:top-[180px] self-start w-full">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 w-full text-center uppercase tracking-widest">Live Preview</h3>
                    <div className="relative w-full max-w-[300px] aspect-[1/1.414] bg-white shadow-xl rounded overflow-hidden border border-slate-300">
                        {currentImage ? (
                            <img src={currentImage} className="absolute inset-0 w-full h-full object-contain" alt="Template Preview" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                <FileImage size={48} />
                            </div>
                        )}
                        
                        {/* Overlay text block based on margins */}
                        <div 
                            className="absolute border-2 border-indigo-400 border-dashed bg-indigo-500/10 flex flex-col p-2 text-[8px] text-slate-700 overflow-hidden"
                            style={renderPreviewStyle()}
                        >
                            <div className="font-bold border-b border-slate-300 pb-1 mb-1">Patient Name - Age - Date</div>
                            <div className="font-bold text-[10px] my-1">Rx</div>
                            <ul className="list-disc pl-3">
                                <li>Paracetamol 500mg - 1-0-1 (5 days)</li>
                                <li>Amoxicillin 250mg - 1-1-1 (5 days)</li>
                                <li>Pantoprazole 40mg - 1-0-0 (5 days)</li>
                            </ul>
                            <div className="mt-2 font-bold">Advice:</div>
                            <p>Take rest, drink plenty of fluids.</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold text-center mt-4 uppercase tracking-widest">The dashed box represents where your text will print.</p>
                </div>
            </div>

            {/* Notification */}
            {notification.visible && (
                <div className={`fixed bottom-10 right-10 p-4 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold z-50 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}
        </div>
    );
};

export default PrescriptionTemplateTab;
