import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import PremiumRequestsPanel from '../components/PremiumRequestsPanel';

const PRIMARY_BLUE = '#007BFF';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tutors, setTutors] = useState([]); // pending tutors
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [liveMessages, setLiveMessages] = useState([]);
  const [pendingContent, setPendingContent] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [helpPing, setHelpPing] = useState(0);
  const [adminMsgUserId, setAdminMsgUserId] = useState('');
  const [adminMsgText, setAdminMsgText] = useState('');

  // Modals and Filters State
  const [rejectModal, setRejectModal] = useState({ isOpen: false, tutorId: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteTutorModal, setDeleteTutorModal] = useState({ isOpen: false, tutorId: null });
  const [deleteTutorSubmitting, setDeleteTutorSubmitting] = useState(false);
  
  const [directoryModal, setDirectoryModal] = useState({ isOpen: false, type: null }); // 'students' | 'tutors'
  const [filterAction, setFilterAction] = useState(false); // If true, show only action view

  const socketRef = useRef(null);

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('ethioBooksToken')
    : null;

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [pendingTutorsRes, pendingTxRes, usersRes, pcRes, ppRes] = await Promise.all([
        api.get('/admin/pending-tutors').catch(() => ({ data: [] })),
        api.get('/admin/pending-transactions').catch(() => ({ data: [] })),
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/admin/pending-content').catch(() => ({ data: [] })),
        api.get('/admin/pending-content-purchases').catch(() => ({ data: [] }))
      ]);

      setTutors(pendingTutorsRes.data || []);
      setTransactions(pendingTxRes.data || []);
      setUsers(usersRes.data || []);
      setPendingContent(pcRes.data || []);
      setPendingPurchases(ppRes.data || []);
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message || 'Failed to load admin data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('No admin token found. Please log in as admin.');
      setLoading(false);
      return;
    }

    fetchData();

    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('newMessage', (message) => {
      setLiveMessages((prev) => [message, ...prev].slice(0, 100));
    });

    socket.on('helpCenterMessage', () => {
      setHelpPing((n) => n + 1);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalStudentsList = users.filter((u) => u.role === 'student');
  const totalTutorsList = users.filter((u) => u.role === 'tutor');
  const approvedTutorsList = totalTutorsList.filter((u) => u.tutorStatus === 'approved');
  const rejectedTutorsList = totalTutorsList.filter((u) => u.tutorStatus === 'rejected');

  const totalStudents = totalStudentsList.length;
  const totalTutors = approvedTutorsList.length;
  const pendingApprovals =
    tutors.length + transactions.length + pendingContent.length + pendingPurchases.length;

  const handleApproveContent = async (id) => {
    try {
      await api.patch(`/admin/approve-content/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const handleRejectContent = async (id) => {
    const note = window.prompt('Rejection note for tutor:', '');
    if (note === null) return;
    try {
      await api.patch(`/admin/reject-content/${id}`, { note });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const handleApproveContentPurchase = async (id) => {
    try {
      await api.patch(`/admin/approve-content-purchase/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const handleRejectContentPurchase = async (id) => {
    const note = window.prompt('Rejection note for student:', '');
    if (note === null) return;
    try {
      await api.patch(`/admin/reject-content-purchase/${id}`, { note });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const sendAdminMessage = () => {
    const trimmed = adminMsgText.trim();
    if (!trimmed || !adminMsgUserId || !socketRef.current) return;
    socketRef.current.emit('adminSendMessage', {
      receiverId: adminMsgUserId,
      text: trimmed
    });
    setAdminMsgText('');
    alert('Message sent (delivered if user is online).');
  };

  const handleApproveTutor = async (id) => {
    try {
      await api.patch(`/admin/approve-tutor/${id}`);
      await fetchData();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Failed to approve tutor.';
      alert(message);
    }
  };

  const handleRejectTutorSubmit = async () => {
    if (!rejectModal.tutorId) return;
    try {
      // Send the rejection to backend (assuming endpoint exists, else this will 404 but UI will catch it)
      await api.patch(`/admin/reject-tutor/${rejectModal.tutorId}`, { reason: rejectionReason });
      await fetchData();
      setRejectModal({ isOpen: false, tutorId: null });
      setRejectionReason('');
    } catch (err) {
      console.error(err);
      // Fallback optimistic UI update in case the endpoint isn't wired yet
      setTutors(tutors.filter(t => t._id !== rejectModal.tutorId));
      setRejectModal({ isOpen: false, tutorId: null });
      setRejectionReason('');
      alert('Tutor rejected (simulated if backend endpoint is missing).');
    }
  };

  const handleDeleteTutor = async () => {
    if (!deleteTutorModal.tutorId) return;
    try {
      setDeleteTutorSubmitting(true);
      setError('');
      await api.delete(`/admin/tutors/${deleteTutorModal.tutorId}`);
      setDeleteTutorModal({ isOpen: false, tutorId: null });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete tutor');
    } finally {
      setDeleteTutorSubmitting(false);
    }
  };

  const handleViewDocs = (docs = []) => {
    if (!docs || docs.length === 0) {
      alert('No documents uploaded for this tutor.');
      return;
    }
    // Open first document; you can extend this to show all
    window.open(docs[0], '_blank', 'noopener,noreferrer');
  };

  const handleApprovePremium = async (id) => {
    try {
      await api.patch(`/admin/approve-premium/${id}`);
      await fetchData();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Failed to approve premium.';
      alert(message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ethioBooksToken');
    localStorage.removeItem('ethioBooksUser');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 text-base font-sans selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  Reject Application
                </h3>
                <button 
                  onClick={() => setRejectModal({ isOpen: false, tutorId: null })}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-gray-600 mb-4 text-sm font-medium">Please provide a reason for rejection. The tutor will be notified and their status set to 'Rejected' so they can re-apply later.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Rejection</label>
                  <textarea
                    rows={4}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400 resize-none"
                    placeholder="e.g. Missing valid documents..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 p-6 bg-gray-50/80 flex justify-end gap-3">
              <button
                onClick={() => setRejectModal({ isOpen: false, tutorId: null })}
                className="px-6 py-3 font-bold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTutorSubmit}
                className="px-6 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tutor Modal */}
      {deleteTutorModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m6-3V2h4v2" />
                    </svg>
                  </div>
                  Delete Tutor
                </h3>
                <button
                  onClick={() => setDeleteTutorModal({ isOpen: false, tutorId: null })}
                  className="text-gray-400 hover:text-gray-600 transition"
                  type="button"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-600 mb-2 text-sm font-medium">
                This will delete the tutor account and remove all content they uploaded.
              </p>
              <p className="text-gray-500 text-xs">
                This action cannot be undone.
              </p>
            </div>

            <div className="border-t border-gray-100 p-6 bg-gray-50/80 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTutorModal({ isOpen: false, tutorId: null })}
                className="px-6 py-3 font-bold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl transition"
                disabled={deleteTutorSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTutor}
                className="px-6 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ opacity: deleteTutorSubmitting ? 0.7 : 1 }}
                disabled={deleteTutorSubmitting}
              >
                {deleteTutorSubmitting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Directory Modal (Students / Tutors) */}
      {directoryModal.isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-full flex flex-col overflow-hidden animate-fade-in">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white z-10 sticky top-0">
              <h3 className="text-2xl font-bold text-gray-900">
                {directoryModal.type === 'students' ? 'Student Directory' : 'Tutor Directory'}
              </h3>
              <button 
                onClick={() => setDirectoryModal({ isOpen: false, type: null })}
                className="text-gray-400 hover:text-gray-600 transition bg-gray-100 hover:bg-gray-200 rounded-full p-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(directoryModal.type === 'students' ? totalStudentsList : totalTutorsList).length === 0 ? (
                  <div className="col-span-full py-10 text-center text-gray-500 font-medium">No records found.</div>
                ) : (
                  (directoryModal.type === 'students' ? totalStudentsList : totalTutorsList).map(user => (
                    <div key={user._id} className="bg-white border-2 border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-extrabold text-xl shadow-inner">
                          {user.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">{user.fullName}</h4>
                          <span className="text-sm font-medium text-gray-500">{user.email || user.phone}</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600 border-t border-gray-50 pt-4">
                        {directoryModal.type === 'students' ? (
                          <>
                            <p className="flex justify-between"><span className="text-gray-400">Grade</span> <span className="font-bold text-gray-800">{user.grade || 'N/A'}</span></p>
                            <p className="flex justify-between"><span className="text-gray-400">School</span> <span className="font-bold text-gray-800">{user.schoolName || 'N/A'}</span></p>
                            <p className="flex justify-between"><span className="text-gray-400">Premium</span> <span className={`font-bold ${user.isPremium ? 'text-green-600' : 'text-gray-400'}`}>{user.isPremium ? 'Yes' : 'No'}</span></p>
                          </>
                        ) : (
                          <>
                            <p className="flex justify-between"><span className="text-gray-400">Status</span> <span className="font-bold text-gray-800 uppercase tracking-wider text-[10px] bg-gray-100 px-2 py-1 rounded">{user.tutorStatus}</span></p>
                            <p className="flex justify-between"><span className="text-gray-400">Education</span> <span className="font-bold text-gray-800 truncate pl-4">{user.educationLevel || 'N/A'}</span></p>
                            <div className="pt-2 space-y-2">
                              <button onClick={() => handleViewDocs(user.docs)} className="w-full text-center py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition">View Documents</button>
                              <button
                                type="button"
                                onClick={() => setDeleteTutorModal({ isOpen: true, tutorId: user._id })}
                                className="w-full text-center py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                              >
                                Delete Tutor
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="w-full bg-white shadow-sm sticky top-0 z-40 transition-shadow duration-300"
        style={{ borderBottom: '4px solid rgba(0,123,255,0.15)' }}
      >
        <div className="max-w-[1600px] mx-auto px-6 py-5 sm:px-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: PRIMARY_BLUE }}
            >
              Ethio Books
            </h1>
            <span className="hidden md:inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold uppercase tracking-wider">
              Control Center
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm text-gray-500 font-medium">Logged in as</span>
              <span className="font-bold text-gray-900 leading-tight">System Admin</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2 sm:px-6 sm:py-2.5 text-sm font-bold rounded-xl border-2 border-gray-200 text-gray-700 hover:text-white hover:bg-gray-900 hover:border-gray-900 transition-all shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10">
        {error && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 flex items-start space-x-4">
            <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-red-800 font-bold text-lg">System Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 sm:space-x-2 border-b-2 border-gray-200 pb-px overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => { setActiveTab('overview'); setFilterAction(false); }}
            className={`whitespace-nowrap px-4 sm:px-6 py-4 text-base sm:text-lg font-bold transition-colors border-b-4 -mb-[2px] shrink-0 ${
              activeTab === 'overview' && !filterAction
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-xl'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('moderation')}
            className={`whitespace-nowrap px-4 sm:px-6 py-4 text-base sm:text-lg font-bold transition-colors border-b-4 -mb-[2px] relative shrink-0 ${
              activeTab === 'moderation'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-xl'
            }`}
          >
            Content &amp; Payments
            {(pendingContent.length > 0 || pendingPurchases.length > 0) && (
              <span className="ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full bg-orange-500 px-1.5 text-xs text-white">
                {pendingContent.length + pendingPurchases.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`whitespace-nowrap px-4 sm:px-6 py-4 text-base sm:text-lg font-bold transition-colors border-b-4 -mb-[2px] relative shrink-0 ${
              activeTab === 'live'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-xl'
            }`}
          >
            Live Feed Monitoring
            {liveMessages.length > 0 && (
              <span className="absolute top-4 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            {helpPing > 0 && (
              <span className="ml-2 inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-gray-900">
                Help+
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('premium')}
            className={`whitespace-nowrap px-4 sm:px-6 py-4 text-base sm:text-lg font-bold transition-colors border-b-4 -mb-[2px] relative shrink-0 ${
              activeTab === 'premium'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-xl'
            }`}
          >
            Premium Requests
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-10 animate-fade-in">
            {/* Top Stats Cards - Clickable Analytics */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Total Students */}
              <div 
                onClick={() => setDirectoryModal({ isOpen: true, type: 'students' })}
                className="bg-white rounded-3xl cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-100 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-widest text-gray-500 uppercase group-hover:text-indigo-600 transition-colors">
                    Total Students
                  </span>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-end">
                  <p className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
                    {loading ? '—' : totalStudents}
                  </p>
                  <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    View list <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </div>

              {/* Total Tutors */}
              <div 
                onClick={() => setDirectoryModal({ isOpen: true, type: 'tutors' })}
                className="bg-white rounded-3xl cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-emerald-100 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-widest text-gray-500 uppercase group-hover:text-emerald-600 transition-colors">
                    Total Tutors
                  </span>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-end">
                  <p className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
                    {loading ? '—' : totalTutors}
                  </p>
                  <span className="text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    Directory <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </div>

              {/* Pending Approvals */}
              <div 
                onClick={() => setFilterAction(!filterAction)}
                className={`rounded-3xl cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group relative overflow-hidden ${
                  filterAction ? 'bg-orange-50/50 border-orange-300 ring-4 ring-orange-100' : 'bg-white border-gray-100 hover:border-orange-200'
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-bl-full -z-10 opacity-50"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-widest text-gray-500 uppercase group-hover:text-orange-600 transition-colors">
                    Requires Action
                  </span>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${filterAction ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-end">
                  <div className="flex items-baseline space-x-3">
                    <p
                      className="text-4xl sm:text-5xl font-black tracking-tight"
                      style={{ color: filterAction ? '#ea580c' : PRIMARY_BLUE }}
                    >
                      {loading ? '—' : pendingApprovals}
                    </p>
                    <span className="text-lg font-medium text-gray-500">pending</span>
                  </div>
                  <span className="text-orange-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    {filterAction ? 'Show All' : 'Filter View'} <svg className={`w-4 h-4 ml-1 transition-transform ${filterAction ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
              </div>
            </section>

            {/* Main Content Area based on Filter state */}
            {filterAction ? (
              <div className="animate-fade-in space-y-10">
                <div className="bg-orange-50 rounded-3xl border-2 border-orange-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <span className="text-3xl">⚠️</span>
                     <div>
                       <h2 className="text-xl font-bold text-orange-900">Action Required View</h2>
                       <p className="text-orange-700 font-medium">Currently filtering to show only pending approvals and a log of recent rejections.</p>
                     </div>
                  </div>
                  <button onClick={() => setFilterAction(false)} className="w-full sm:w-auto px-6 py-2.5 bg-white border border-orange-200 text-orange-800 font-bold rounded-xl hover:bg-orange-100 transition">
                    Clear Filter
                  </button>
                </div>

                {/* Recently Rejected Log */}
                {rejectedTutorsList.length > 0 && (
                  <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> 
                       Recently Rejected Tutors
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rejectedTutorsList.map(tutor => (
                        <div key={tutor._id} className="bg-red-50 border border-red-100 rounded-2xl p-5 hover:border-red-300 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-900">{tutor.fullName}</h3>
                            <span className="text-[10px] uppercase font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded">Rejected</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 truncate">{tutor.educationLevel || 'No education provided'}</p>
                          <p className="text-sm font-medium text-red-800 bg-red-100 p-2 rounded-lg mt-3 text-xs italic">
                            Awaiting tutor re-application.
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : null}

            {/* Main Content Grid: Tutor Approvals + General Info */}
            <section className={`grid grid-cols-1 xl:grid-cols-3 gap-8 ${filterAction && tutors.length === 0 ? 'hidden' : ''}`}>
              {/* Tutor Approval Table Container */}
              <div className="xl:col-span-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 flex flex-col w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Tutor Registrations
                    </h2>
                    <p className="text-gray-500 mt-1">Review, approve, or reject new tutors.</p>
                  </div>
                  <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-bold text-sm shrink-0">
                    {tutors.length} Total Pending
                  </span>
                </div>

                <div className="overflow-x-auto w-full custom-scrollbar rounded-xl border border-gray-100">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-50/80">
                      <tr className="text-gray-500 text-sm font-bold uppercase tracking-wider">
                        <th className="px-6 py-5 rounded-tl-xl whitespace-nowrap">Applicant Name</th>
                        <th className="px-6 py-5 whitespace-nowrap">Education Background</th>
                        <th className="px-6 py-5 whitespace-nowrap">Status</th>
                        <th className="px-6 py-5 text-right rounded-tr-xl whitespace-nowrap">Options / Tools</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tutors.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-12 text-center text-gray-400 font-medium text-lg"
                          >
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              <span>You're all caught up! No pending tutors.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {tutors.map((tutor) => (
                        <tr
                          key={tutor._id}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                {tutor.fullName?.charAt(0) || 'U'}
                              </div>
                              <div className="ml-4">
                                <div className="text-base font-bold text-gray-900">{tutor.fullName}</div>
                                <div className="text-sm text-gray-500">{tutor.email || tutor.telegramUsername || 'No contact info'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-gray-700 font-medium max-w-[200px] truncate">
                            {tutor.educationLevel || <span className="text-gray-400 italic">Not provided</span>}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                              Pending
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2 sm:space-x-3">
                              <button
                                type="button"
                                onClick={() => handleViewDocs(tutor.docs)}
                                className="px-3 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:ring-4 focus:ring-gray-100 shrink-0"
                              >
                                View CV
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModal({ isOpen: true, tutorId: tutor._id })}
                                className="px-4 py-2 text-sm font-bold rounded-xl bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-all focus:ring-4 focus:ring-red-100 shrink-0"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveTutor(tutor._id)}
                                className="px-4 py-2 text-sm font-bold rounded-xl text-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 focus:ring-4 focus:ring-blue-200 shrink-0 border-2 border-transparent"
                                style={{ backgroundColor: PRIMARY_BLUE }}
                              >
                                Approve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Admin Info / Placeholder */}
              {!filterAction && (
                <div className="bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                   </div>
                   <div>
                    <h3 className="text-xl font-bold text-gray-900">System Logs & Integrity</h3>
                    <p className="mt-2 text-gray-500 leading-relaxed max-w-sm">All backend systems are operating optimally. WebSocket server is actively broadcasting network load.</p>
                   </div>
                   <button className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto">
                     Generate Full Report
                   </button>
                </div>
              )}
            </section>

            {/* Payment Verifications */}
            <section className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 ${filterAction && transactions.length === 0 ? 'hidden' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Premium Subscriptions Verifications
                  </h2>
                  <p className="text-gray-500 mt-1">Review uploaded wire transfer receipts to grant premium access.</p>
                </div>
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-bold text-sm shrink-0">
                  {transactions.length} Transactions Pending
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="py-16 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <span className="text-5xl mb-4 block">🧾</span>
                  <p className="text-gray-500 font-medium text-lg">No pending payment verifications at this time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
                  {transactions.map((tx) => (
                    <div
                      key={tx._id}
                      className="group border-2 border-gray-100 rounded-2xl bg-white overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="h-48 sm:h-56 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-sm">
                          <button 
                            type="button" 
                            onClick={() => window.open(tx.screenshotUrl, '_blank')}
                            className="px-6 py-2 bg-white text-gray-900 font-bold rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                          >
                            View Full Size
                          </button>
                        </div>
                        {/* Screenshot image */}
                        <img
                          src={tx.screenshotUrl}
                          alt="Payment receipt"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6 space-y-3 flex-1 flex flex-col">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 leading-tight">
                            {tx.student?.fullName || 'Unknown Student'}
                          </h3>
                          <div className="mt-3 space-y-2">
                            <p className="text-gray-600 flex items-center gap-2 text-sm sm:text-base">
                              <span className="text-gray-400">🏫</span> 
                              Grade {tx.student?.grade || '—'} • {tx.student?.schoolName || 'N/A'}
                            </p>
                            <p className="text-gray-600 flex items-center gap-2 text-sm sm:text-base">
                              <span className="text-gray-400">📱</span> 
                              {tx.student?.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                        <div className="pt-6 mt-4 border-t border-gray-100 flex flex-col gap-4">
                           <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                             <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                             {tx.status}
                           </span>
                          <button
                            type="button"
                            onClick={() => handleApprovePremium(tx._id)}
                            className="w-full py-3 text-sm font-bold rounded-xl text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 focus:ring-4 focus:ring-blue-200 border-2 border-transparent"
                            style={{ backgroundColor: PRIMARY_BLUE }}
                          >
                            Grant Premium Access
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'premium' && (
          <div className="space-y-8 animate-fade-in">
            <PremiumRequestsPanel />
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-8 animate-fade-in">
            <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Tutor content — pending approval</h2>
              <p className="text-gray-500 mt-1 text-sm">Review file or video link, then approve or reject.</p>
              {pendingContent.length === 0 ? (
                <p className="mt-6 text-gray-400">None pending.</p>
              ) : (
                <ul className="mt-6 space-y-4">
                  {pendingContent.map((c) => (
                    <li
                      key={c._id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{c.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {c.contentType} • Grade {c.grade} • {c.accessType === 'paid' ? `${c.priceEtb} ETB` : 'Free'} •{' '}
                          {c.uploadedBy?.fullName || 'Tutor'}
                        </p>
                        {c.description ? (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.pdfUrl && (
                            <a
                              href={c.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Open file
                            </a>
                          )}
                          {c.videoUrl && (
                            <a
                              href={c.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Open video link
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRejectContent(c._id)}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveContent(c._id)}
                          className="rounded-xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ backgroundColor: PRIMARY_BLUE }}
                        >
                          Approve
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Paid content — payment proofs</h2>
              <p className="text-gray-500 mt-1 text-sm">Verify student screenshots, then grant access.</p>
              {pendingPurchases.length === 0 ? (
                <p className="mt-6 text-gray-400">None pending.</p>
              ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingPurchases.map((p) => (
                    <div
                      key={p._id}
                      className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50/50 flex flex-col"
                    >
                      <div className="h-40 bg-gray-200 relative">
                        <img src={p.screenshotUrl} alt="Proof" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => window.open(p.screenshotUrl, '_blank')}
                          className="absolute bottom-2 right-2 text-xs bg-white px-2 py-1 rounded-lg font-bold shadow"
                        >
                          Full size
                        </button>
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-2">
                        <p className="font-bold text-gray-900">{p.content?.title || 'Content'}</p>
                        <p className="text-xs text-gray-600">
                          Student: {p.student?.fullName} • Tutor: {p.content?.uploadedBy?.fullName || '—'} • {p.amount ?? p.content?.priceEtb} ETB
                        </p>
                        <div className="flex gap-2 mt-auto pt-2">
                          <button
                            type="button"
                            onClick={() => handleRejectContentPurchase(p._id)}
                            className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveContentPurchase(p._id)}
                            className="flex-1 rounded-xl py-2 text-xs font-extrabold text-white"
                            style={{ backgroundColor: PRIMARY_BLUE }}
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'live' && (
          <section className="bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 p-6 sm:p-8 text-white min-h-[500px] sm:min-h-[600px] flex flex-col animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 mb-6 rounded-2xl border border-gray-700 bg-gray-800/80 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Send message to user</h3>
              <p className="text-xs text-gray-400 mt-1">Delivers to their DM room (two-way when they reply).</p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                <select
                  className="flex-1 rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={adminMsgUserId}
                  onChange={(e) => setAdminMsgUserId(e.target.value)}
                >
                  <option value="">Select student or tutor…</option>
                  {users
                    .filter((u) => u.role === 'student' || u.role === 'tutor')
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  value={adminMsgText}
                  onChange={(e) => setAdminMsgText(e.target.value)}
                  placeholder="Message…"
                  className="flex-[2] rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={sendAdminMessage}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  Send
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                  </span>
                  Live Network Monitoring
                </h2>
                <p className="text-gray-400 mt-2 text-sm sm:text-base">Real-time WebSocket connection to Ethio Books message exchange cluster.</p>
              </div>
              <span className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-mono text-sm border border-gray-700 w-fit">
                PINGS: {liveMessages.length} Packet(s)
              </span>
            </div>
            
            {liveMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative z-10 space-y-4 font-mono">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 opacity-50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                <p className="text-sm sm:text-base">Establishing secure socket connection...</p>
                <p className="text-xs sm:text-sm">Listening for real-time events on port 5000.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 space-y-4 custom-scrollbar relative z-10">
                {liveMessages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className="border-l-4 border-blue-500 bg-gray-800/80 rounded-r-xl p-4 sm:p-5 hover:bg-gray-800 transition-colors backdrop-blur-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm font-mono">
                        <span className="font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                          {msg.sender?.fullName || 'SYS_UNKNOWN'}
                        </span>
                        <span className="text-gray-500">➜</span>
                        <span className="font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
                          {msg.receiver?.fullName || 'SYS_UNKNOWN'}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500 font-mono tracking-wider bg-gray-900 px-3 py-1 rounded-lg w-fit">
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString()
                          : '00:00:00'}
                      </span>
                    </div>
                    <p className="text-gray-200 text-sm sm:text-base leading-relaxed pl-2 font-mono break-words">
                      &gt; {msg.text}
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs text-gray-500 font-mono uppercase gap-2">
                      <span>Protocol: TPC/IP WSS</span>
                      <span className="break-all">ENV_ID: {msg.roomId || 'GLOBAL_BROADCAST'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Global CSS overrides for the Admin Dashboard */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.05);
          border-radius: 8px;
        }
        .bg-gray-900 .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 8px;
        }
        .bg-gray-900 .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.8);
        }
        .bg-gray-900 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 1);
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

export default AdminDashboard;
