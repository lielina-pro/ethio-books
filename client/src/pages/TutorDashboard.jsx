import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TutorDashboard = () => {
    const [tutorData, setTutorData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTutorData(res.data);
            } catch (err) {
                console.error("Error fetching tutor data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <div className="p-8 text-white">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-bold mb-4">Teacher Dashboard</h1>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <h2 className="text-xl mb-2">Welcome, {tutorData?.fullName || 'Teacher'}</h2>
                <p className="text-gray-400">Status:
                    <span className={`ml-2 ${tutorData?.status === 'approved' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {tutorData?.status?.toUpperCase() || 'PENDING'}
                    </span>
                </p>
                {tutorData?.rejectionNote && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded">
                        <p className="text-red-500 font-bold">Rejection Note:</p>
                        <p>{tutorData.rejectionNote}</p>
                    </div>
                )}
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Your Uploaded Materials</h3>
                <p className="text-gray-500 italic text-sm">No materials uploaded yet.</p>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition">
                    Upload New Material
                </button>
            </div>
        </div>
    );
};

export default TutorDashboard;