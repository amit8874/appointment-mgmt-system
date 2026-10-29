import React, { useState, useEffect } from 'react';
import { 
    FileImage, 
    Upload, 
    Trash2, 
    CheckCircle, 
    AlertCircle, 
    Save, 
    User, 
    Stethoscope, 
    Sliders, 
    Sparkles, 
    Bot, 
    Check, 
    X, 
    RefreshCw, 
    Zap,
    SlidersHorizontal,
    Layers,
    Info,
    QrCode
} from 'lucide-react';
import organizationApi from '../../../api/organizationApi';
import { commonApi } from '../../../services/api';

const PrescriptionTemplateTab = () => {
    const [settings, setSettings] = useState({
        enabled: false,
        templateMode: 'manual', // 'manual' | 'ai_vision'
        templateUrl: '',
        printableArea: { top: 55, left: 12, right: 12, bottom: 30 },
        headerArea: { top: 45, left: 10, right: 10, height: 25 },
        bodyArea: { top: 75, bottom: 25, left: 12, right: 12 },
        aiHeaderArea: { top: 45, left: 10, right: 10, height: 25 },
        aiBodyArea: { top: 75, bottom: 25, left: 12, right: 12 },
        fontSize: 12,
        footerBarcode: '',
        footerText: '',
        footerSubText: ''
    });
    const [uploadingBarcode, setUploadingBarcode] = useState(false);
    const barcodeInputRef = React.useRef(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzingAI, setAnalyzingAI] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '', visible: false });
    const [filePreview, setFilePreview] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification({ message: '', type: '', visible: false }), 4000);
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await organizationApi.getPrescriptionTemplateSettings();
            if (data?.data) {
                const d = data.data;
                const defaultHeader = {
                    top: d.printableArea?.top ? Math.max(10, d.printableArea.top - 15) : 45,
                    left: d.printableArea?.left !== undefined ? d.printableArea.left : 10,
                    right: d.printableArea?.right !== undefined ? d.printableArea.right : 10,
                    height: 25
                };
                const defaultBody = {
                    top: d.printableArea?.top ? d.printableArea.top + 15 : 75,
                    bottom: d.printableArea?.bottom !== undefined ? d.printableArea.bottom : 25,
                    left: d.printableArea?.left !== undefined ? d.printableArea.left : 12,
                    right: d.printableArea?.right !== undefined ? d.printableArea.right : 12
                };

                setSettings({
                    enabled: Boolean(d.enabled),
                    templateMode: d.templateMode || 'manual',
                    templateUrl: d.templateUrl || '',
                    printableArea: d.printableArea || { top: 55, left: 12, right: 12, bottom: 30 },
                    headerArea: d.headerArea || defaultHeader,
                    bodyArea: d.bodyArea || defaultBody,
                    aiHeaderArea: d.aiHeaderArea || defaultHeader,
                    aiBodyArea: d.aiBodyArea || defaultBody,
                    fontSize: d.fontSize || 12,
                    footerBarcode: d.footerBarcode || '',
                    footerText: d.footerText || '',
                    footerSubText: d.footerSubText || ''
                });
            }
        } catch (error) {
            console.error('Failed to load template settings:', error);
            showNotification('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (customSettings = null) => {
        setLoading(true);
        const dataToSave = customSettings || settings;
        try {
            await organizationApi.updatePrescriptionTemplateSettings({
                enabled: dataToSave.enabled,
                templateMode: dataToSave.templateMode,
                printableArea: dataToSave.printableArea,
                headerArea: dataToSave.headerArea,
                bodyArea: dataToSave.bodyArea,
                aiHeaderArea: dataToSave.aiHeaderArea,
                aiBodyArea: dataToSave.aiBodyArea,
                fontSize: dataToSave.fontSize,
                footerBarcode: dataToSave.footerBarcode || '',
                footerText: dataToSave.footerText || '',
                footerSubText: dataToSave.footerSubText || ''
            });
            const modeLabel = dataToSave.templateMode === 'ai_vision' ? 'AI Vision Auto-Detect' : 'Manual Margins';
            showNotification(`Settings saved successfully! (${modeLabel} active for print)`);
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
            const objectUrl = URL.createObjectURL(file);
            setFilePreview(objectUrl);

            const formData = new FormData();
            formData.append('image', file);
            const response = await organizationApi.uploadPrescriptionTemplate(formData);
            
            setSettings(prev => ({ ...prev, templateUrl: response.templateUrl, enabled: true }));
            showNotification('Letterhead template uploaded successfully');
        } catch (error) {
            showNotification('Failed to upload template', 'error');
            setFilePreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleBarcodeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingBarcode(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await commonApi.uploadImage(formData);
            if (res?.imageUrl) {
                const updated = { ...settings, footerBarcode: res.imageUrl };
                setSettings(updated);
                await handleSave(updated);
                showNotification('Prescription footer barcode uploaded successfully!');
            }
        } catch (err) {
            console.error('Failed to upload barcode:', err);
            showNotification('Failed to upload barcode image', 'error');
        } finally {
            setUploadingBarcode(false);
            if (barcodeInputRef.current) barcodeInputRef.current.value = '';
        }
    };

    const handleRemoveBarcode = async () => {
        const updated = { ...settings, footerBarcode: '' };
        setSettings(updated);
        await handleSave(updated);
        showNotification('Footer barcode removed from prescription');
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await organizationApi.deletePrescriptionTemplate();
            setSettings(prev => ({ 
                ...prev, 
                templateUrl: '', 
                enabled: false,
                templateMode: 'manual'
            }));
            setFilePreview(null);
            showNotification('Template removed');
        } catch (error) {
            showNotification('Failed to remove template', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Trigger AI Vision Analysis
    const handleRunAIAnalysis = async (fileToUpload = null) => {
        if (!fileToUpload && !settings.templateUrl && !filePreview) {
            showNotification('Please upload a letterhead pad first or select a file to analyze.', 'error');
            return;
        }

        setAnalyzingAI(true);
        try {
            let formData = null;
            if (fileToUpload) {
                formData = new FormData();
                formData.append('image', fileToUpload);
                const previewUrl = URL.createObjectURL(fileToUpload);
                setFilePreview(previewUrl);
            }

            const res = await organizationApi.analyzePrescriptionTemplateWithAI(formData);

            if (res && res.success) {
                setAiAnalysisResult(res);
                setShowAIModal(true);
                if (res.templateUrl) {
                    setSettings(prev => ({ ...prev, templateUrl: res.templateUrl, enabled: true }));
                }
            } else {
                showNotification(res?.message || 'AI Vision could not detect prescription layout.', 'error');
            }
        } catch (error) {
            console.error('AI Analysis failed:', error);
            showNotification(error.response?.data?.message || 'AI analysis failed. Please try again.', 'error');
        } finally {
            setAnalyzingAI(false);
        }
    };

    // Apply AI Vision results and save
    const handleApplyAIResults = async () => {
        if (!aiAnalysisResult) return;

        const updatedSettings = {
            ...settings,
            templateMode: 'ai_vision',
            enabled: true,
            aiHeaderArea: aiAnalysisResult.headerArea || settings.aiHeaderArea,
            aiBodyArea: aiAnalysisResult.bodyArea || settings.aiBodyArea,
            templateUrl: aiAnalysisResult.templateUrl || settings.templateUrl
        };

        setSettings(updatedSettings);
        setShowAIModal(false);
        await handleSave(updatedSettings);
    };

    const handleHeaderChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            headerArea: {
                ...prev.headerArea,
                [field]: Number(value)
            }
        }));
    };

    const handleBodyChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            bodyArea: {
                ...prev.bodyArea,
                [field]: Number(value)
            }
        }));
    };

    const handleAIHeaderChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            aiHeaderArea: {
                ...prev.aiHeaderArea,
                [field]: Number(value)
            }
        }));
    };

    const handleAIBodyChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            aiBodyArea: {
                ...prev.aiBodyArea,
                [field]: Number(value)
            }
        }));
    };

    // Active coordinates depending on selected mode
    const isAiMode = settings.templateMode === 'ai_vision';
    const activeHeaderArea = isAiMode ? (settings.aiHeaderArea || settings.headerArea) : settings.headerArea;
    const activeBodyArea = isAiMode ? (settings.aiBodyArea || settings.bodyArea) : settings.bodyArea;

    // Calculate preview styles for Header and Body independently (A4: 210mm x 297mm)
    const renderHeaderPreviewStyle = () => {
        const { top, left, right, height } = activeHeaderArea || { top: 45, left: 10, right: 10, height: 25 };
        const topPct = (top / 297) * 100;
        const leftPct = (left / 210) * 100;
        const rightPct = (right / 210) * 100;
        const heightPct = (height / 297) * 100;

        return {
            top: `${topPct}%`,
            left: `${leftPct}%`,
            right: `${rightPct}%`,
            height: `${heightPct}%`,
        };
    };

    const renderBodyPreviewStyle = () => {
        const { top, bottom, left, right } = activeBodyArea || { top: 75, bottom: 25, left: 12, right: 12 };
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
        return <div className="p-8 text-center text-slate-500 font-bold">Loading Template Settings...</div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            {/* Header Bar */}
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 rounded-t-2xl">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Prescription Letterhead & Margin Manager</h2>
                        {isAiMode ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                                <Sparkles size={12} className="text-purple-600 animate-pulse" /> AI Vision Active
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <SlidersHorizontal size={12} className="text-indigo-600" /> Manual Active
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Independent Header & Body A4 Layout with Groq AI Vision Detection
                    </p>
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
                        onClick={() => handleSave()}
                        disabled={loading || uploading || analyzingAI}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Controls (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* MODE SELECTOR TABS */}
                    <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setSettings(prev => ({ ...prev, templateMode: 'manual' }))}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                                !isAiMode 
                                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <SlidersHorizontal size={15} />
                            <span>1. Manual Calibration</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSettings(prev => ({ ...prev, templateMode: 'ai_vision' }))}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                                isAiMode 
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Sparkles size={15} className={isAiMode ? "animate-pulse" : ""} />
                            <span>2. AI Vision Auto-Detect</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold ${isAiMode ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                                Groq AI
                            </span>
                        </button>
                    </div>

                    {/* Letterhead Upload Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700">A4 Background Letterhead Image</label>
                            {currentImage && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} /> Active Pad
                                </span>
                            )}
                        </div>

                        {!currentImage ? (
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-4 pb-5">
                                    {uploading ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="mb-1 text-sm text-slate-500 font-bold"><span className="text-indigo-600">Click to upload letterhead</span> or drag and drop</p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">PNG, JPG, WebP up to 5MB (A4 Dimensions)</p>
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
                                    <h4 className="text-xs font-bold text-slate-800 truncate">Uploaded Letterhead Template</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">A4 Page (210 x 297 mm)</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                                        <CheckCircle size={12} /> Ready for Printing & AI Vision
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                                    <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                                        <Upload size={14} className="text-slate-500" /> Replace
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={handleDelete}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <Trash2 size={14} /> Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Prescription Footer Barcode / QR Code Section */}
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <QrCode size={18} className="text-indigo-600" />
                                <label className="text-sm font-bold text-slate-800">Prescription Footer Barcode / QR Code</label>
                            </div>
                            {settings.footerBarcode && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} /> Active in Footer
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Upload your clinic's QR Code or Barcode to display on the bottom-left of the prescription footer. <strong>If no barcode is uploaded, nothing will show in the footer.</strong>
                        </p>

                        {!settings.footerBarcode ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-3 pb-4">
                                    {uploadingBarcode ? (
                                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
                                    ) : (
                                        <>
                                            <QrCode className="w-7 h-7 text-indigo-500 mb-1.5" />
                                            <p className="mb-0.5 text-xs text-slate-700 font-bold"><span className="text-indigo-600">Click to upload Barcode / QR Code</span></p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PNG, JPG up to 2MB (Square)</p>
                                        </>
                                    )}
                                </div>
                                <input 
                                    ref={barcodeInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleBarcodeUpload} 
                                    disabled={uploadingBarcode} 
                                />
                            </label>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="relative w-20 h-20 bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex-shrink-0 flex items-center justify-center p-1.5">
                                    <img src={settings.footerBarcode} alt="Footer Barcode" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 text-center sm:text-left min-w-0">
                                    <h4 className="text-xs font-bold text-slate-800 truncate">Prescription Footer Barcode</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Displayed at bottom-left in Oviaan template</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                                        <CheckCircle size={12} /> Ready for Print & PDF
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                                    <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                                        <Upload size={14} className="text-slate-500" /> Replace
                                        <input ref={barcodeInputRef} type="file" className="hidden" accept="image/*" onChange={handleBarcodeUpload} />
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={handleRemoveBarcode}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <Trash2 size={14} /> Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Prescription Footer Text / Notice Section */}
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Info size={18} className="text-indigo-600" />
                                <label className="text-sm font-bold text-slate-800">Prescription Footer Notice / Instructions</label>
                            </div>
                            {settings.footerText && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} /> Active in Footer
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Write any text, instructions, or notice you want to print in the prescription footer (next to the barcode). <strong>If left empty, no text will be printed in the footer.</strong>
                        </p>
                        <div className="space-y-2">
                            <textarea
                                rows={3}
                                value={settings.footerText}
                                onChange={(e) => setSettings(prev => ({ ...prev, footerText: e.target.value }))}
                                placeholder="e.g.&#10;SCAN FOR USEFUL INFORMATION AND APPOINTMENTS&#10;PRESCRIPTION VALID FOR 7 DAYS&#10;Emergency / WhatsApp: +91 98765 43210"
                                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl p-3 outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        "SCAN FOR USEFUL INFORMATION AND APPOINTMENTS\nPRESCRIPTION VALID FOR 7 DAYS",
                                        "PRESCRIPTION VALID FOR 7 DAYS",
                                        "FOR APPOINTMENTS & EMERGENCY CONTACT CLINIC DESK"
                                    ].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSettings(prev => ({ ...prev, footerText: preset }))}
                                            className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-pointer transition-colors shadow-2xs"
                                        >
                                            + Sample {idx + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSave()}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    <Save size={13} /> Save Footer Text
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Additional Footer Sub-Text (Plain Black Text without Strip) */}
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Info size={18} className="text-slate-600" />
                                <label className="text-sm font-bold text-slate-800">Additional Footer Notice (Plain Black Text / No Strip)</label>
                            </div>
                            {settings.footerSubText && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} /> Active in Footer
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Write any additional secondary text to show directly below the red footer notice. It will display in simple black text without any background or border strip across print preview, downloaded PDF, and WhatsApp-sent PDF.
                        </p>
                        <div className="space-y-2">
                            <textarea
                                rows={2}
                                value={settings.footerSubText}
                                onChange={(e) => setSettings(prev => ({ ...prev, footerSubText: e.target.value }))}
                                placeholder="e.g. This is a computer generated prescription and does not require physical signature.&#10;Consultation valid for 7 days."
                                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl p-3 outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                            />
                            <div className="flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => handleSave()}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    <Save size={13} /> Save Additional Footer Text
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* AI VISION PANEL (Shown when AI Vision mode is selected) */}
                    {/* ========================================================================= */}
                    {isAiMode && (
                        <div className="bg-gradient-to-br from-purple-50 via-indigo-50/40 to-slate-50 p-5 rounded-2xl border-2 border-purple-200 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-purple-950">AI Vision Auto-Calibration</h3>
                                        <p className="text-[11px] font-bold text-purple-700">Groq Optical Layout Recognition</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full border border-purple-200">
                                    Active for Print
                                </span>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                                Upload your prescription pad and Groq AI will automatically scan the pre-printed patient header lines (Name, Age/Sex, Date, Chief Complain) and Rx medicines boundary to compute millimeter-accurate print margins.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleRunAIAnalysis()}
                                    disabled={analyzingAI || (!settings.templateUrl && !filePreview)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {analyzingAI ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            <span>Analyzing Pad with AI Vision...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Bot size={16} />
                                            <span>Scan Current Pad with AI</span>
                                        </>
                                    )}
                                </button>

                                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-xs font-black cursor-pointer shadow-sm transition-colors">
                                    <Upload size={14} />
                                    <span>Upload & Scan New Pad</span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleRunAIAnalysis(e.target.files[0]);
                                        }}
                                        disabled={analyzingAI}
                                    />
                                </label>
                            </div>

                            {/* Detected AI Coordinates Summary */}
                            <div className="pt-2 border-t border-purple-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                        <CheckCircle size={13} className="text-emerald-600" /> Active AI Margins (A4 Millimeters)
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500">Fine-tune if needed</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    {/* AI Header Area Box */}
                                    <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-xs space-y-2">
                                        <div className="flex items-center justify-between text-indigo-700 font-black text-[11px]">
                                            <span className="flex items-center gap-1"><User size={13} /> Header Area</span>
                                            <span className="text-[9px] bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-600">Patient Info</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                                            <div>
                                                <span className="text-slate-400 block">Top</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiHeaderArea?.top ?? 45}
                                                    onChange={(e) => handleAIHeaderChange('top', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Height</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiHeaderArea?.height ?? 25}
                                                    onChange={(e) => handleAIHeaderChange('height', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Left</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiHeaderArea?.left ?? 10}
                                                    onChange={(e) => handleAIHeaderChange('left', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Right</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiHeaderArea?.right ?? 10}
                                                    onChange={(e) => handleAIHeaderChange('right', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Body Area Box */}
                                    <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-xs space-y-2">
                                        <div className="flex items-center justify-between text-emerald-700 font-black text-[11px]">
                                            <span className="flex items-center gap-1"><Stethoscope size={13} /> Body Area</span>
                                            <span className="text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-600">Rx & Medicines</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                                            <div>
                                                <span className="text-slate-400 block">Top</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiBodyArea?.top ?? 75}
                                                    onChange={(e) => handleAIBodyChange('top', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Bottom</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiBodyArea?.bottom ?? 25}
                                                    onChange={(e) => handleAIBodyChange('bottom', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Left</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiBodyArea?.left ?? 12}
                                                    onChange={(e) => handleAIBodyChange('left', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Right</span>
                                                <input 
                                                    type="number"
                                                    value={settings.aiBodyArea?.right ?? 12}
                                                    onChange={(e) => handleAIBodyChange('right', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* MANUAL MARGINS PANEL (Shown when Manual mode is selected) */}
                    {/* ========================================================================= */}
                    {!isAiMode && (
                        <div className="space-y-6">
                            {/* PART 1: Patient Header Margins */}
                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-indigo-950 flex items-center gap-2">
                                        <User size={16} className="text-indigo-600" />
                                        Part 1: Patient Info Header (Name, Age/Sex, Date, Chief Complain)
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Independent</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Configure length, width, and position for the Patient Info Header separately. Set Left & Right margin to <strong>0mm</strong> if you want it full-bleed across the entire page.
                                </p>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Top Offset (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.headerArea?.top ?? 45} 
                                            onChange={(e) => handleHeaderChange('top', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Left Margin (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.headerArea?.left ?? 10} 
                                            onChange={(e) => handleHeaderChange('left', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Right Margin (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.headerArea?.right ?? 10} 
                                            onChange={(e) => handleHeaderChange('right', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Height (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.headerArea?.height ?? 25} 
                                            onChange={(e) => handleHeaderChange('height', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PART 2: Prescription Body Margins */}
                            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                                        <Stethoscope size={16} className="text-emerald-600" />
                                        Part 2: Prescription Body (Rx, Medicines, Advice)
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Independent</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Configure where medicines, treatments, and clinical advice print. Adjusting these will not move the Patient Info Header above.
                                </p>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Top Offset (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.bodyArea?.top ?? 75} 
                                            onChange={(e) => handleBodyChange('top', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Bottom Space (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.bodyArea?.bottom ?? 25} 
                                            onChange={(e) => handleBodyChange('bottom', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Left Margin (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.bodyArea?.left ?? 12} 
                                            onChange={(e) => handleBodyChange('left', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Right Margin (mm)</label>
                                        <input 
                                            type="number" 
                                            value={settings.bodyArea?.right ?? 12} 
                                            onChange={(e) => handleBodyChange('right', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Font Size Setting */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Sliders size={16} className="text-slate-600" /> Base Font Size (px)
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">Controls standard font scale across the prescription</p>
                        </div>
                        <input 
                            type="number" 
                            min="9" 
                            max="20"
                            value={settings.fontSize || 12} 
                            onChange={(e) => setSettings(prev => ({...prev, fontSize: Number(e.target.value)}))}
                            className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Right side: Live Preview (5 cols) */}
                <div className="lg:col-span-5 bg-slate-100 rounded-2xl p-5 border border-slate-200 flex flex-col items-center lg:sticky lg:top-[160px] self-start w-full">
                    <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex items-center gap-1.5">
                            <FileImage size={14} className={isAiMode ? "text-purple-600" : "text-indigo-600"} />
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                {isAiMode ? 'AI Vision Preview' : 'Manual Margins Preview'}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="flex items-center gap-1 text-indigo-700"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Header</span>
                            <span className="flex items-center gap-1 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Body</span>
                        </div>
                    </div>

                    {/* A4 Paper Aspect Ratio Container (1 : 1.414) */}
                    <div className="relative w-full max-w-[340px] aspect-[1/1.414] bg-white shadow-xl rounded overflow-hidden border border-slate-300 select-none">
                        {currentImage ? (
                            <img src={currentImage} className="absolute inset-0 w-full h-full object-contain" alt="Letterhead Template Preview" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                <FileImage size={40} />
                                <span className="text-[10px] font-bold uppercase tracking-wider mt-2">No Template Uploaded</span>
                            </div>
                        )}
                        
                        {/* 1. INDEPENDENT PATIENT HEADER BOX */}
                        <div 
                            className={`absolute border-2 border-dashed flex flex-col justify-center px-1.5 py-1 text-[7px] text-slate-800 overflow-hidden transition-all duration-150 ${
                                isAiMode 
                                    ? 'border-purple-500 bg-purple-500/15' 
                                    : 'border-indigo-500 bg-indigo-500/15'
                            }`}
                            style={renderHeaderPreviewStyle()}
                        >
                            <span className={`absolute top-0 right-1 text-[6px] font-black uppercase tracking-tighter bg-white/90 px-1 rounded-bl ${
                                isAiMode ? 'text-purple-700' : 'text-indigo-700'
                            }`}>
                                {isAiMode ? 'AI Header' : 'Header Area'}
                            </span>
                            
                            {/* Line 1: Name and Age/Sex */}
                            <div className="flex items-center justify-between w-full mb-0.5">
                                <div className="flex items-baseline gap-1 flex-1 min-w-0 pr-1">
                                    <span className="font-bold text-slate-900 whitespace-nowrap">Name :</span>
                                    <span className="border-b border-dotted border-slate-600 font-semibold truncate flex-1">Amit Maurya</span>
                                </div>
                                <div className="flex items-baseline gap-1 shrink-0">
                                    <span className="font-bold text-slate-900 whitespace-nowrap">Age/Sex :</span>
                                    <span className="border-b border-dotted border-slate-600 font-semibold min-w-[20px] text-center">23/M</span>
                                </div>
                            </div>

                            {/* Line 2: Date and Chief Complain */}
                            <div className="flex items-baseline w-full">
                                <div className="flex items-baseline gap-1 shrink-0 pr-1">
                                    <span className="font-bold text-slate-900 whitespace-nowrap">Date :</span>
                                    <span className="border-b border-dotted border-slate-600 font-semibold min-w-[28px]">24/10/26</span>
                                </div>
                                <div className="flex items-baseline gap-1 flex-1 min-w-0">
                                    <span className="font-bold text-slate-900 whitespace-nowrap">Chief Complain :</span>
                                    <span className="border-b border-dotted border-slate-600 font-semibold truncate flex-1">Pt c/o Pain in tooth</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. INDEPENDENT PRESCRIPTION BODY BOX */}
                        <div 
                            className="absolute border-2 border-emerald-500 border-dashed bg-emerald-500/10 flex flex-col p-1.5 text-[7px] text-slate-800 overflow-hidden transition-all duration-150"
                            style={renderBodyPreviewStyle()}
                        >
                            <span className="absolute top-0 right-1 text-[6px] font-black uppercase tracking-tighter text-emerald-700 bg-white/90 px-1 rounded-bl">
                                {isAiMode ? 'AI Body (Rx)' : 'Body Area (Rx)'}
                            </span>
                            <div className="font-bold font-serif text-[10px] text-slate-900 my-0.5 italic">Rx</div>
                            <ul className="list-disc pl-2.5 space-y-0.5 leading-tight text-[6.5px]">
                                <li>Paracetamol 500mg - 1-0-1 (5 days)</li>
                                <li>Amoxicillin 250mg - 1-1-1 (5 days)</li>
                                <li>Pantoprazole 40mg - 1-0-0 (5 days)</li>
                            </ul>
                            <div className="mt-1 font-bold text-[6.5px]">Advice:</div>
                            <p className="text-[6px] text-slate-600 leading-tight">Take rest, drink plenty of fluids.</p>
                        </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded-full ${isAiMode ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {isAiMode ? '🤖 Mode: AI Vision Active' : '✏️ Mode: Manual Margins Active'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* AI VISION ANALYSIS RESULT POPUP MODAL */}
            {/* ========================================================================= */}
            {showAIModal && aiAnalysisResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                                    <Sparkles size={20} className="text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black tracking-tight">AI Vision Pad Analysis</h3>
                                    <p className="text-xs text-purple-200 font-bold">Groq AI Detected Layout Successfully</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAIModal(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-5 overflow-y-auto">
                            {/* Confidence Badge & Summary */}
                            <div className="flex items-center justify-between p-3.5 bg-purple-50 rounded-2xl border border-purple-100">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-wider text-purple-700">Detection Confidence</div>
                                    <div className="text-xs font-black text-slate-800 capitalize mt-0.5">
                                        {aiAnalysisResult.confidence || 'High'} Confidence Calibrated
                                    </div>
                                </div>
                                <span className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                                    <CheckCircle size={14} /> Ready to Apply
                                </span>
                            </div>

                            {/* Detected Fields Checklist */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                                    <CheckCircle size={14} className="text-indigo-600" />
                                    Detected Pre-Printed Pad Elements
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(aiAnalysisResult.detectedFields || ['Name', 'Age/Sex', 'Date', 'Chief Complain', 'Rx']).map((field, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] flex-shrink-0">✓</span>
                                            <span className="truncate">{field}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Millimeter Coordinates Calculated */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-1.5">
                                    <div className="text-xs font-black text-indigo-950 flex items-center gap-1">
                                        <User size={13} className="text-indigo-600" /> Header Area
                                    </div>
                                    <div className="text-[11px] text-slate-600 space-y-0.5 font-bold">
                                        <div>Top Offset: <span className="text-slate-900 font-black">{aiAnalysisResult.headerArea?.top ?? 45} mm</span></div>
                                        <div>Height: <span className="text-slate-900 font-black">{aiAnalysisResult.headerArea?.height ?? 25} mm</span></div>
                                        <div>Margins: <span className="text-slate-900 font-black">L: {aiAnalysisResult.headerArea?.left ?? 10}mm | R: {aiAnalysisResult.headerArea?.right ?? 10}mm</span></div>
                                    </div>
                                </div>

                                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-1.5">
                                    <div className="text-xs font-black text-emerald-950 flex items-center gap-1">
                                        <Stethoscope size={13} className="text-emerald-600" /> Body Area (Rx)
                                    </div>
                                    <div className="text-[11px] text-slate-600 space-y-0.5 font-bold">
                                        <div>Top Offset: <span className="text-slate-900 font-black">{aiAnalysisResult.bodyArea?.top ?? 75} mm</span></div>
                                        <div>Bottom Space: <span className="text-slate-900 font-black">{aiAnalysisResult.bodyArea?.bottom ?? 25} mm</span></div>
                                        <div>Margins: <span className="text-slate-900 font-black">L: {aiAnalysisResult.bodyArea?.left ?? 12}mm | R: {aiAnalysisResult.bodyArea?.right ?? 12}mm</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Summary note */}
                            {aiAnalysisResult.summary && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                                    <span className="font-black text-slate-800">AI Note: </span>
                                    {aiAnalysisResult.summary}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAIModal(false)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyAIResults}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                            >
                                <Sparkles size={14} />
                                <span>Apply & Activate for Printing</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification.visible && (
                <div className={`fixed bottom-10 right-10 p-4 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold z-50 animate-in slide-in-from-bottom-5 duration-200 ${
                    notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                    {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {notification.message}
                </div>
            )}
        </div>
    );
};

export default PrescriptionTemplateTab;
