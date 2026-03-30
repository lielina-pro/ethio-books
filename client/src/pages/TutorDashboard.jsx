import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import NotificationBell from '../components/NotificationBell';
import DMReplyModal from '../components/DMReplyModal';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const PRIMARY_BLUE = '#007BFF';

const TutorDashboard = () => {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksToken') : null;
  const [tutor, setTutor] = useState(null);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState('overview'); // overview | content | documents | bookings | activity
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [myContent, setMyContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [helpAdminId, setHelpAdminId] = useState(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseSubject, setCourseSubject] = useState('General');
  const [courseGrade, setCourseGrade] = useState(10);
  const [courseAccess, setCourseAccess] = useState('paid');
  const [coursePrice, setCoursePrice] = useState(50);
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [courseSections, setCourseSections] = useState([
    { sectionTitle: 'Section 1', lessons: [{ title: '', type: 'video', url: '', duration: '' }] }
  ]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [dmStudent, setDmStudent] = useState(null);

  const openChat = (msg) => {
    if (!msg?.senderId) return;
    setDmStudent({
      _id: msg.senderId,
      fullName: msg.senderName || 'Student',
      isPremium: !!msg.senderIsPremium
    });
    setDmModalOpen(true);
  };

  const refreshMyContent = async () => {
    const token = localStorage.getItem('ethioBooksToken');
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:5000/api/content/tutor/mine', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyContent(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (!tutor?._id) return;
    fetchRecentMessages();

    const socket = io('http://localhost:5000', { auth: { token } });
    socket.on('newMessage', (msg) => {
      if (msg?.receiver?.id && msg.receiver.id.toString() === tutor._id.toString()) {
        fetchRecentMessages();
      }
    });
    socket.on('notification', () => {
      fetchRecentMessages();
    });

    return () => {
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tutor?._id]);

  const fetchRecentMessages = async () => {
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:5000/api/messages/recent?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentMessages(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching recent messages:', error?.response?.data || error);
      setRecentMessages([]);
    }
  };

    useEffect(() => {
    let localUser = null;

    try {
      const stored = localStorage.getItem('ethioBooksUser');
      if (stored) {
        localUser = JSON.parse(stored);
        setTutor(localUser);
      }
    } catch {
      localUser = null;
    }

    const token = localStorage.getItem('ethioBooksToken');
    if (!token) {
      setLoading(false);
      return;
    }

    const syncProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

        const serverUser = res.data;
        setTutor(serverUser);

        // Keep localStorage aligned with latest tutor status
        localStorage.setItem('ethioBooksUser', JSON.stringify(serverUser));
            } catch (err) {
        console.error('Tutor dashboard profile sync failed:', err);
        if (!localUser) {
          setError('Unable to load tutor profile. Please log in again.');
        }
            } finally {
                setLoading(false);
            }
        };

    syncProfile();
    }, []);

  useEffect(() => {
    const token = localStorage.getItem('ethioBooksToken');
    if (!token) return;
    if (!tutor || tutor.role !== 'tutor') return;

    const loadBookings = async () => {
      try {
        setBookingsLoading(true);
        setBookingsError('');
        const res = await axios.get('http://localhost:5000/api/bookings/tutor', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Tutor bookings fetch failed:', err);
        setBookingsError(err?.response?.data?.message || 'Failed to load booking requests.');
      } finally {
        setBookingsLoading(false);
      }
    };

    loadBookings();
  }, [tutor]);

  useEffect(() => {
    const token = localStorage.getItem('ethioBooksToken');
    if (!token || !tutor || tutor.tutorStatus !== 'approved') return;

    const load = async () => {
      try {
        setContentLoading(true);
        await refreshMyContent();
        try {
          const help = await axios.get('http://localhost:5000/api/auth/help-admin', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (help.data?._id) setHelpAdminId(help.data._id);
        } catch {
          setHelpAdminId(null);
        }
      } finally {
        setContentLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutor?.tutorStatus, tutor?._id]);

  const addSection = () => {
    setCourseSections((prev) => [
      ...prev,
      { sectionTitle: `Section ${prev.length + 1}`, lessons: [{ title: '', type: 'video', url: '', duration: '' }] }
    ]);
  };

  const addLesson = (sectionIdx) => {
    setCourseSections((prev) =>
      prev.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              lessons: [...section.lessons, { title: '', type: 'video', url: '', duration: '' }]
            }
          : section
      )
    );
  };

  const updateSectionTitle = (sectionIdx, value) => {
    setCourseSections((prev) =>
      prev.map((section, idx) => (idx === sectionIdx ? { ...section, sectionTitle: value } : section))
    );
  };

  const updateLesson = (sectionIdx, lessonIdx, key, value) => {
    setCourseSections((prev) =>
      prev.map((section, sIdx) =>
        sIdx === sectionIdx
          ? {
              ...section,
              lessons: section.lessons.map((lesson, lIdx) =>
                lIdx === lessonIdx ? { ...lesson, [key]: value } : lesson
              )
            }
          : section
      )
    );
  };

  const submitCourse = async () => {
    const token = localStorage.getItem('ethioBooksToken');
    if (!token) return;
    if (!courseTitle.trim() || !courseSubject.trim()) {
      toast.error('Title and subject are required.');
      return;
    }
    if (courseAccess === 'paid' && (Number(coursePrice) < 10 || Number(coursePrice) > 200)) {
      toast.error('Price must be 10–200 ETB.');
      return;
    }

    const cleanedSections = courseSections
      .map((section) => ({
        sectionTitle: (section.sectionTitle || '').trim(),
        lessons: (section.lessons || [])
          .map((lesson) => ({
            title: (lesson.title || '').trim(),
            type: lesson.type || 'video',
            url: (lesson.url || '').trim(),
            duration: (lesson.duration || '').trim()
          }))
          .filter((lesson) => lesson.title)
      }))
      .filter((section) => section.sectionTitle && section.lessons.length > 0);

    if (cleanedSections.length === 0) {
      toast.error('Add at least one section with one lesson.');
      return;
    }

    try {
      setUploadSubmitting(true);
      await axios.post(
        'http://localhost:5000/api/content',
        {
          title: courseTitle.trim(),
          description: courseDesc,
          subject: courseSubject,
          grade: Number(courseGrade),
          accessType: courseAccess,
          priceEtb: courseAccess === 'paid' ? Number(coursePrice) : undefined,
          contentType: 'video',
          videoUrl: 'https://example.com/course-overview',
          courseData: {
            thumbnail: courseThumbnail.trim(),
            sections: cleanedSections
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourseTitle('');
      setCourseDesc('');
      setCourseThumbnail('');
      setCourseSections([{ sectionTitle: 'Section 1', lessons: [{ title: '', type: 'video', url: '', duration: '' }] }]);
      await refreshMyContent();
      toast.success('Course submitted for admin approval.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Submit failed');
    } finally {
      setUploadSubmitting(false);
    }
  };

  const docs = useMemo(() => (Array.isArray(tutor?.docs) ? tutor.docs : []), [tutor]);
  const tutorStatus = tutor?.tutorStatus || tutor?.status || 'pending';
  const memberSince = tutor?.createdAt ? new Date(tutor.createdAt).toLocaleDateString() : '—';
  const rating = typeof tutor?.averageRating === 'number' ? tutor.averageRating : 0;
  const ratingCount = typeof tutor?.ratingsCount === 'number' ? tutor.ratingsCount : 0;

  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);
  const upcomingSessions = useMemo(
    () => bookings.filter((b) => b.status === 'accepted' && new Date(b.date).getTime() >= Date.now()),
    [bookings]
  );
  const completedSessions = useMemo(() => bookings.filter((b) => b.status === 'completed'), [bookings]);

  const updateBookingStatus = async (bookingId, status) => {
    const token = localStorage.getItem('ethioBooksToken');
    if (!token) return;
    try {
      await axios.put(
        `http://localhost:5000/api/bookings/${bookingId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const res = await axios.get('http://localhost:5000/api/bookings/tutor', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('updateBookingStatus failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to update booking status.');
    }
  };

  const profileCompletion = useMemo(() => {
    const checks = [
      !!tutor?.fullName,
      !!tutor?.email,
      !!tutor?.phone,
      !!tutor?.telegramUsername,
      !!tutor?.educationLevel,
      !!tutor?.achievements,
      !!tutor?.trialVideoUrl,
      Array.isArray(tutor?.docs) && tutor.docs.length > 0
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [tutor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">Loading tutor dashboard...</p>
        </div>
      </div>
    );
  }

  if (!tutor || error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-100 bg-red-50 p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-800">Tutor Dashboard</h1>
          <p className="mt-2 text-sm text-red-700">{error || 'No tutor data found.'}</p>
          <Link to="/auth" className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <DMReplyModal
        isOpen={dmModalOpen}
        onClose={() => setDmModalOpen(false)}
        student={dmStudent}
        tutorId={tutor?._id?.toString() || ''}
      />

      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: PRIMARY_BLUE }}>
              Ethio Books
            </h1>
            <p className="text-xs text-gray-500">Tutor Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {tutorStatus === 'pending' ? (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                <span className="mr-2">←</span> Back to Home
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => {
                  localStorage.removeItem('ethioBooksToken');
                  localStorage.removeItem('ethioBooksUser');
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Log out
              </Link>
            )}
            <NotificationBell token={token} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-10">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Welcome, {tutor.fullName || 'Tutor'}</h2>
              <p className="mt-1 text-sm text-gray-500">Manage your profile, documents, and tutor updates.</p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                tutorStatus === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : tutorStatus === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {tutorStatus}
                    </span>
          </div>
        </section>

        {tutorStatus === 'pending' && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Application under review</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your tutor account is currently pending approval. Our admin team will verify your submitted documents.
            </p>

            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <h4 className="text-sm font-bold text-gray-800">
                Uploaded Documents ({tutor?.docs?.length || 0})
              </h4>
              {tutor?.docs && tutor.docs.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {tutor.docs.map((docUrl, idx) => (
                    <li
                      key={`${docUrl}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <span className="text-xs font-medium text-gray-700">Document {idx + 1}</span>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-700 hover:underline"
                      >
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No documents found yet.</p>
              )}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              <span className="font-medium">Next step:</span> You will receive an email notification once your profile is approved.
              You can also check your status by logging in anytime.
            </p>
          </section>
        )}

        {tutorStatus === 'approved' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-white font-extrabold"
                    style={{ backgroundColor: PRIMARY_BLUE }}
                  >
                    {(tutor.fullName || 'T').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-gray-900">{tutor.fullName || 'Tutor'}</p>
                    <p className="text-[11px] text-gray-500">Approved Tutor</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Profile completion</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${profileCompletion}%`, backgroundColor: PRIMARY_BLUE }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    <span className="font-bold text-gray-900">{profileCompletion}%</span> complete
                  </p>
                </div>

                <div className="mt-5 grid gap-2">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'content', label: 'Content / Courses' },
                    { id: 'documents', label: 'Documents' },
                    { id: 'bookings', label: 'Bookings' },
                    { id: 'help', label: 'Contact Admin' },
                    { id: 'activity', label: 'Recent activity' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePanel(item.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                        activePanel === item.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => toast.info('Document upload coming soon')}
                    className="w-full rounded-xl px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md"
                    style={{ backgroundColor: PRIMARY_BLUE }}
                  >
                    Upload Docs
                  </button>
                </div>
              </div>
            </aside>

            <section className="lg:col-span-9 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Documents</p>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900">{docs.length}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Students</p>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900">{tutor.totalStudents ?? 0}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {tutor.totalSessions ? `${tutor.totalSessions} sessions` : `${completedSessions.length} completed`}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Rating</p>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900">
                    {rating.toFixed(1)}{' '}
                    <span className="text-sm font-bold text-gray-500">({ratingCount})</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Verification</p>
                  <p className={`mt-2 text-xl font-extrabold ${tutor.isVerified ? 'text-emerald-700' : 'text-yellow-700'}`}>
                    {tutor.isVerified ? 'Verified' : 'Needs review'}
                  </p>
                </div>
              </div>

              {activePanel === 'overview' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-extrabold text-gray-900">Profile details</h3>
                      <span className="text-xs text-gray-500">Member since {memberSince}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Email</dt>
                        <dd className="mt-1 font-semibold text-gray-800">{tutor.email || '—'}</dd>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Phone</dt>
                        <dd className="mt-1 font-semibold text-gray-800">{tutor.phone || '—'}</dd>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Telegram</dt>
                        <dd className="mt-1 font-semibold text-gray-800">{tutor.telegramUsername || '—'}</dd>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Education</dt>
                        <dd className="mt-1 font-semibold text-gray-800">{tutor.educationLevel || '—'}</dd>
                      </div>
                    </dl>
                    {tutor.achievements && (
                      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Achievements</p>
                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">{tutor.achievements}</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-extrabold text-gray-900">Profile checklist</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Finish your profile to build trust and increase student interest.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {[
                        { label: 'Add Telegram username', ok: !!tutor.telegramUsername },
                        { label: 'Add education level', ok: !!tutor.educationLevel },
                        { label: 'Add achievements', ok: !!tutor.achievements },
                        { label: 'Add trial video URL', ok: !!tutor.trialVideoUrl },
                        { label: 'Upload documents', ok: docs.length > 0 }
                      ].map((item) => (
                        <li key={item.label} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
                          <span className="font-semibold text-gray-700">{item.label}</span>
                          <span className={`text-xs font-extrabold ${item.ok ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {item.ok ? 'DONE' : 'TODO'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => toast.info('Document upload coming soon')}
                        className="rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md"
                        style={{ backgroundColor: PRIMARY_BLUE }}
                      >
                        Upload docs
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-extrabold text-gray-900 mb-4">Messages</h3>
                    <div className="space-y-2">
                      {recentMessages.slice(0, 3).map((msg) => (
                        <div
                          key={msg._id}
                          className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg px-2"
                          onClick={() => openChat(msg)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && openChat(msg)}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{msg.senderName}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{msg.content}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!msg.read && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                            <span className="text-xs text-gray-400">
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                      {recentMessages.length === 0 && <p className="text-gray-500 text-sm">No recent messages</p>}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'documents' && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-gray-900">Documents</h3>
                    <button
                      type="button"
                    onClick={() => toast.info('Document upload coming soon')}
                      className="rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md"
                      style={{ backgroundColor: PRIMARY_BLUE }}
                    >
                      Upload (soon)
                    </button>
                  </div>
                  {docs.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No documents uploaded yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {docs.map((url, idx) => (
                        <li
                          key={`${url}-${idx}`}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-gray-900">Document {idx + 1}</p>
                            <p className="mt-1 text-xs text-gray-500 truncate">{url}</p>
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                          >
                            View
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activePanel === 'bookings' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-extrabold text-gray-900">Booking requests</h3>
                      <span className="text-xs text-gray-500">{pendingBookings.length} pending</span>
                    </div>

                    {bookingsError ? (
                      <p className="mt-3 text-sm text-red-600">{bookingsError}</p>
                    ) : bookingsLoading ? (
                      <p className="mt-3 text-sm text-gray-600">Loading bookings...</p>
                    ) : pendingBookings.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-600">No pending requests right now.</p>
                    ) : (
                      <ul className="mt-4 space-y-3">
                        {pendingBookings.map((b) => (
                          <li key={b._id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-extrabold text-gray-900">{b.subject}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Student: {b.studentId?.fullName || '—'} • {new Date(b.date).toLocaleString()} • {b.duration} min
                                </p>
                                <p className="mt-1 text-xs text-gray-600">
                                  Amount: <span className="font-bold text-gray-900">{b.amount} ETB</span>
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateBookingStatus(b._id, 'rejected')}
                                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBookingStatus(b._id, 'accepted')}
                                  className="rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md"
                                  style={{ backgroundColor: PRIMARY_BLUE }}
                                >
                                  Accept
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-extrabold text-gray-900">Upcoming sessions</h3>
                        <span className="text-xs text-gray-500">{upcomingSessions.length}</span>
                      </div>
                      {upcomingSessions.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">No upcoming sessions.</p>
                      ) : (
                        <ul className="mt-4 space-y-2">
                          {upcomingSessions.slice(0, 5).map((b) => (
                            <li key={b._id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                              <p className="text-sm font-bold text-gray-900">{b.subject}</p>
                              <p className="text-xs text-gray-500">
                                {b.studentId?.fullName || '—'} • {new Date(b.date).toLocaleString()} • {b.duration} min
                              </p>
                            </li>
                          ))}
                        </ul>
                )}
            </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-extrabold text-gray-900">Completed sessions</h3>
                        <span className="text-xs text-gray-500">{completedSessions.length}</span>
                      </div>
                      {completedSessions.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">No completed sessions yet.</p>
                      ) : (
                        <ul className="mt-4 space-y-2">
                          {completedSessions.slice(0, 5).map((b) => (
                            <li key={b._id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                              <p className="text-sm font-bold text-gray-900">{b.subject}</p>
                              <p className="text-xs text-gray-500">
                                {b.studentId?.fullName || '—'} • {new Date(b.date).toLocaleString()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'content' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-extrabold text-gray-900">Course builder</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={refreshMyContent}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Build a full course with sections and lessons. New courses are <span className="font-semibold">pending</span> until admin approval.
                    </p>
                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        placeholder="Course title"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                      />
                      <textarea
                        rows={3}
                        placeholder="Course description"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        value={courseDesc}
                        onChange={(e) => setCourseDesc(e.target.value)}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Subject"
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          value={courseSubject}
                          onChange={(e) => setCourseSubject(e.target.value)}
                        />
                        <select
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          value={courseGrade}
                          onChange={(e) => setCourseGrade(Number(e.target.value))}
                        >
                          {[7, 8, 9, 10, 11, 12].map((g) => (
                            <option key={g} value={g}>
                              Grade {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <select
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          value={courseAccess}
                          onChange={(e) => setCourseAccess(e.target.value)}
                        >
                          <option value="free">Free</option>
                          <option value="paid">Paid</option>
                        </select>
                        <input
                          type="number"
                          min={10}
                          max={200}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          value={coursePrice}
                          onChange={(e) => setCoursePrice(Number(e.target.value))}
                          disabled={courseAccess !== 'paid'}
                        />
                        <input
                          type="url"
                          placeholder="Thumbnail URL"
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          value={courseThumbnail}
                          onChange={(e) => setCourseThumbnail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {courseSections.map((section, sIdx) => (
                        <div key={`section-${sIdx}`} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                          <input
                            type="text"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
                            value={section.sectionTitle}
                            onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                            placeholder="Section title"
                          />
                          <div className="mt-3 space-y-2">
                            {(section.lessons || []).map((lesson, lIdx) => (
                              <div key={`lesson-${sIdx}-${lIdx}`} className="rounded-lg border border-gray-200 bg-white p-3">
                                <input
                                  type="text"
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  placeholder="Lesson title"
                                  value={lesson.title}
                                  onChange={(e) => updateLesson(sIdx, lIdx, 'title', e.target.value)}
                                />
                                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                  <select
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    value={lesson.type}
                                    onChange={(e) => updateLesson(sIdx, lIdx, 'type', e.target.value)}
                                  >
                                    <option value="video">Video</option>
                                    <option value="pdf">PDF</option>
                                    <option value="quiz">Quiz</option>
                                  </select>
                                  <input
                                    type="url"
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    placeholder="Lesson URL"
                                    value={lesson.url}
                                    onChange={(e) => updateLesson(sIdx, lIdx, 'url', e.target.value)}
                                  />
                                  <input
                                    type="text"
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    placeholder="Duration (e.g. 12m)"
                                    value={lesson.duration}
                                    onChange={(e) => updateLesson(sIdx, lIdx, 'duration', e.target.value)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => addLesson(sIdx)}
                            className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700"
                          >
                            Add Lesson
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={addSection}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-800"
                      >
                        Add Section
                      </button>
                      <button
                        type="button"
                        disabled={uploadSubmitting}
                        onClick={submitCourse}
                        className="rounded-xl px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                        style={{ backgroundColor: PRIMARY_BLUE }}
                      >
                        {uploadSubmitting ? 'Submitting…' : 'Submit Course'}
                </button>
                    </div>
                    {contentLoading ? (
                      <p className="mt-4 text-sm text-gray-500">Loading…</p>
                    ) : myContent.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-500">No materials uploaded yet.</p>
                    ) : (
                      <ul className="mt-4 space-y-2">
                        {myContent.map((c) => (
                          <li
                            key={c._id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900">{c.title}</p>
                              <p className="text-xs text-gray-500">
                                {c.contentType} • {c.moderationStatus || 'approved'} •{' '}
                                {c.accessType === 'paid' ? `${c.priceEtb} ETB` : 'Free'}
                              </p>
                              {Array.isArray(c?.courseData?.sections) && c.courseData.sections.length > 0 ? (
                                <p className="text-xs text-gray-500">{c.courseData.sections.length} sections</p>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              {(c.pdfUrl || c.videoUrl) && c.moderationStatus !== 'rejected' && (
                                <a
                                  href={c.pdfUrl || c.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-blue-700 hover:underline"
                                >
                                  Open
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activePanel === 'help' && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-extrabold text-gray-900">Contact Admin — Ethio Books Help Center</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Reach the platform team for support, disputes, or account issues.
                  </p>
                  {helpAdminId ? (
                    <div className="mt-4">
                      <ChatWindow otherUserId={helpAdminId} otherUserName="Ethio Books Support" />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-amber-700">
                      Help Center admin is not available. Ensure an admin account exists in the database.
                    </p>
                  )}
                </div>
              )}

              {activePanel === 'activity' && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-extrabold text-gray-900">Recent activity</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Recent approvals, student messages, document updates, and content actions will appear here.
                  </p>
                  <div className="mt-4 space-y-3">
                    {recentMessages.map((msg) => (
                      <div
                        key={msg._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                        onClick={() => openChat(msg)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openChat(msg)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{msg.senderName}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{msg.content}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!msg.read && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                          <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {recentMessages.length === 0 && <p className="text-gray-500 text-sm">No recent messages</p>}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {tutorStatus === 'rejected' && (
          <section className="rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-red-800">Application Rejected</h3>
            <p className="mt-2 text-sm text-red-700">
              Your tutor application needs updates before approval.
            </p>

            <div className="mt-4 rounded-xl border border-red-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-700">Rejection Reason</p>
              <p className="mt-2 text-sm text-gray-700">{tutor.rejectionNote || 'No rejection note provided.'}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="mailto:support@ethiobooks.com"
                className="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Contact Support
              </a>
              <Link
                to="/auth"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Re-apply Later
              </Link>
            </div>
          </section>
        )}
      </main>

      {tutorStatus === 'pending' && (
        <footer id="contact" className="border-t border-gray-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
            <div>
              <h3 className="text-xl font-extrabold" style={{ color: PRIMARY_BLUE }}>
                Ethio Books
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                Helping Ethiopian students learn with confidence through quality tutoring.
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#features" className="hover:text-gray-900">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-gray-900">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#for-tutors" className="hover:text-gray-900">
                    For Tutors
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Contact</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>support@ethiobooks.com</li>
                <li>+251 900 000 000</li>
                <li>Addis Ababa, Ethiopia</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Follow</p>
              <div className="mt-3 flex gap-2">
                {['FB', 'TG', 'YT'].map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} Ethio Books. All rights reserved.
          </div>
        </footer>
      )}
        </div>
    );
};

export default TutorDashboard;