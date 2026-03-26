import React from 'react';
import { ArrowLeft, Building2, Heart, Zap, Brain, Bone, Baby, Users, Eye, Volume2, HeadphonesIcon, Activity, Stethoscope } from 'lucide-react';

const Department = ({ onBackToStep3, onSelectDepartment }) => {
    const departments = [
        {
            id: 'general_medicine',
            title: 'General Medicine',
            description: 'Primary healthcare and general medical consultations',
            icon: <Stethoscope className="w-8 h-8 text-blue-400" />,
            doctors: '15+ Doctors',
            avg_wait: '10-15 mins',
            color: 'blue'
        },
        {
            id: 'cardiology',
            title: 'Cardiology',
            description: 'Heart and cardiovascular system specialists',
            icon: <Heart className="w-8 h-8 text-red-400" />,
            doctors: '8+ Doctors',
            avg_wait: '15-20 mins',
            color: 'red'
        },
        {
            id: 'dermatology',
            title: 'Dermatology',
            description: 'Skin, hair, and nail disorder treatments',
            icon: <Zap className="w-8 h-8 text-green-400" />,
            doctors: '6+ Doctors',
            avg_wait: '10-15 mins',
            color: 'green'
        },
        {
            id: 'neurology',
            title: 'Neurology',
            description: 'Brain and nervous system specialists',
            icon: <Brain className="w-8 h-8 text-purple-400" />,
            doctors: '5+ Doctors',
            avg_wait: '20-25 mins',
            color: 'purple'
        },
        {
            id: 'orthopedics',
            title: 'Orthopedics',
            description: 'Bone, joint, and muscle treatments',
            icon: <Bone className="w-8 h-8 text-orange-400" />,
            doctors: '7+ Doctors',
            avg_wait: '15-20 mins',
            color: 'orange'
        },
        {
            id: 'pediatrics',
            title: 'Pediatrics',
            description: 'Child and adolescent healthcare',
            icon: <Baby className="w-8 h-8 text-pink-400" />,
            doctors: '10+ Doctors',
            avg_wait: '10-15 mins',
            color: 'pink'
        },
        {
            id: 'gynecology',
            title: 'Gynecology',
            description: 'Women\'s reproductive health specialists',
            icon: <Users className="w-8 h-8 text-rose-400" />,
            doctors: '6+ Doctors',
            avg_wait: '15-20 mins',
            color: 'rose'
        },
        {
            id: 'ophthalmology',
            title: 'Ophthalmology',
            description: 'Eye care and vision specialists',
            icon: <Eye className="w-8 h-8 text-cyan-400" />,
            doctors: '4+ Doctors',
            avg_wait: '15-20 mins',
            color: 'cyan'
        },
        {
            id: 'ent',
            title: 'ENT',
            description: 'Ear, Nose, and Throat specialists',
            icon: <Volume2 className="w-8 h-8 text-teal-400" />,
            doctors: '5+ Doctors',
            avg_wait: '10-15 mins',
            color: 'teal'
        },
        {
            id: 'psychiatry',
            title: 'Psychiatry',
            description: 'Mental health and behavioral specialists',
            icon: <HeadphonesIcon className="w-8 h-8 text-indigo-400" />,
            doctors: '4+ Doctors',
            avg_wait: '25-30 mins',
            color: 'indigo'
        },
        {
            id: 'radiology',
            title: 'Radiology',
            description: 'Medical imaging and diagnostic services',
            icon: <Activity className="w-8 h-8 text-gray-400" />,
            doctors: '6+ Doctors',
            avg_wait: '20-25 mins',
            color: 'gray'
        },
        {
            id: 'emergency',
            title: 'Emergency Medicine',
            description: '24/7 urgent care and emergency services',
            icon: <Zap className="w-8 h-8 text-yellow-400" />,
            doctors: '8+ Doctors',
            avg_wait: 'Immediate',
            color: 'yellow'
        }
    ];

    const getColorClasses = (color) => {
        const colorMap = {
            blue: 'from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border-blue-400',
            red: 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 border-red-400',
            green: 'from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border-green-400',
            purple: 'from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 border-purple-400',
            orange: 'from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 border-orange-400',
            pink: 'from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 border-pink-400',
            rose: 'from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 border-rose-400',
            cyan: 'from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 border-cyan-400',
            teal: 'from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 border-teal-400',
            indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 border-indigo-400',
            gray: 'from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 border-gray-400',
            yellow: 'from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 border-yellow-400'
        };
        return colorMap[color] || colorMap.blue;
    };

    return (
        <div className="bg-black/40 p-6 rounded-lg shadow-lg relative z-10 border border-indigo-800/50">
            <div className="mb-6">
                <div className="flex items-center mb-4">
                    <button
                        onClick={onBackToStep3}
                        className="flex items-center text-indigo-400 hover:text-indigo-300 mr-3"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Appointment Type
                    </button>
                </div>
                <h3 className="text-2xl font-extrabold text-indigo-400 flex items-center border-b border-gray-700/50 pb-3">
                    <Building2 className="w-7 h-7 mr-3" /> Select Department
                </h3>
                <p className="text-sm text-gray-300 mt-2">Choose the medical department that best matches your healthcare needs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
                {departments.map((dept) => (
                    <div
                        key={dept.id}
                        onClick={() => onSelectDepartment(dept)}
                        className={`bg-gray-700/50 backdrop-blur-sm border rounded-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 shadow-lg transform hover:scale-105 border-l-4`}
                        style={{borderLeftColor: `var(--${dept.color}-400)`}}
                    >
                        <div className="flex flex-col items-center text-center mb-4">
                            <div className={`mb-3 p-3 bg-gray-600/50 rounded-full`}>
                                {dept.icon}
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">{dept.title}</h4>
                            <p className="text-sm text-gray-300 mb-4">{dept.description}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-indigo-400">Available Doctors:</span>
                                <span className="text-xs text-gray-300">{dept.doctors}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-indigo-400">Avg. Wait Time:</span>
                                <span className="text-xs text-gray-300">{dept.avg_wait}</span>
                            </div>
                        </div>

                        <button className={`w-full mt-4 bg-gradient-to-r ${getColorClasses(dept.color)} text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300`}>
                            Select {dept.title}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Department;
