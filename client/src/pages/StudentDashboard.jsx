import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ContentViewer from '../components/ContentViewer';
import ChatWindow from '../components/ChatWindow';
import NotificationBell from '../components/NotificationBell';
import PremiumUpgradeModal from '../components/PremiumUpgradeModal';
import toast from 'react-hot-toast';

const PRIMARY_BLUE = '#007BFF';
const API_BASE = process.env.REACT_APP_API_URL || 'https://ethio-books.onrender.com';

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600'
};

const StudentDashboard = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState('library');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [library, setLibrary] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [selectedContent, setSelectedContent] = useState(null);
  const [contentViewerOpen, setContentViewerOpen] = useState(false);
  const [helpAdmin, setHelpAdmin] = useState(null);
  const [dmTutorId, setDmTutorId] = useState('');
  const [paymentModal, setPaymentModal] = useState({ open: false, item: null, price: 0 });
  const [payFile, setPayFile] = useState(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [tutorSearch, setTutorSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksToken') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksUser') : null;
  const user = storedUser
    ? (() => {
        try {
          return JSON.parse(storedUser);
        } catch {
          return null;
        }
      })()
    : null;

  const grade = Number(user?.grade) || 10;
  const isPremium = !!user?.isPremium;

  const refreshUserData = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        localStorage.setItem('ethioBooksUser', JSON.stringify(res.data));
      }
    } catch (e) {
      console.error('[StudentDashboard] refreshUserData failed:', e?.response?.data || e);
    }
  };

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${API_BASE}/api`,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [token]);

  const fetchLibraryContent = async () => {
    const gradeParam = Number(user?.grade) || grade;
    try {
      const res = await api.get(`/content/library?grade=${gradeParam}`);
      const data = Array.isArray(res.data) ? res.data : [];
      // eslint-disable-next-line no-console
      console.log('[StudentDashboard] Fetched library:', data);
      // eslint-disable-next-line no-console
      console.log('[StudentDashboard] Library count:', data.length);
      setLibrary(data);
      return data;
    } catch (err) {
      console.error('[StudentDashboard] Library fetch error:', err?.response?.data || err);
      setError(err?.response?.data?.message || 'Failed to load library content.');
      setLibrary([]);
      throw err;
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');

    // Library must not be blocked by tutors/bookings failures (Promise.all short-circuit).
    let libraryOk = false;
    try {
      await fetchLibraryContent();
      libraryOk = true;
    } catch {
      // error already surfaced
    }

    const results = await Promise.allSettled([
      api.get('/content/tutors'),
      api.get('/bookings/student')
    ]);

    const [tutorRes, bookingRes] = results;

    if (tutorRes.status === 'fulfilled') {
      setTutors(Array.isArray(tutorRes.value.data) ? tutorRes.value.data : []);
    } else {
      console.error('[StudentDashboard] Tutors fetch failed:', tutorRes.reason?.response?.data || tutorRes.reason);
      setTutors([]);
      if (libraryOk) {
        setError((prev) => prev || tutorRes.reason?.response?.data?.message || 'Could not load tutors.');
      }
    }

    if (bookingRes.status === 'fulfilled') {
      setBookings(Array.isArray(bookingRes.value.data) ? bookingRes.value.data : []);
    } else {
      console.error('[StudentDashboard] Bookings fetch failed:', bookingRes.reason?.response?.data || bookingRes.reason);
      setBookings([]);
      if (libraryOk && tutorRes.status === 'fulfilled') {
        const msg = bookingRes.reason?.response?.data?.message;
        if (msg) setError((prev) => prev || msg);
      }
    }

    try {
      const h = await api.get('/auth/help-admin');
      setHelpAdmin(h.data || null);
    } catch {
      setHelpAdmin(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!token) {
      setError('Missing auth token. Please log in again.');
      setLoading(false);
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openContent = async (item) => {
    try {
      const res = await api.get(`/content/${item._id}`);
      setSelectedContent(res.data);
      setContentViewerOpen(true);
    } catch (err) {
      const d = err?.response?.data;
      if (err?.response?.status === 403 && d?.needsPayment) {
        setPaymentModal({
          open: true,
          item,
          price: d.priceEtb || item.priceEtb || 50
        });
        setPayFile(null);
      } else {
        alert(d?.message || 'Could not open this content.');
      }
    }
  };

  const submitPaymentProof = async () => {
    if (!paymentModal.item || !payFile) {
      alert('Please choose a payment screenshot.');
      return;
    }
    try {
      setPaySubmitting(true);
      const fd = new FormData();
      fd.append('screenshot', payFile);
      await axios.post(`${API_BASE}/api/content/${paymentModal.item._id}/payment-proof`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentModal({ open: false, item: null, price: 0 });
      setPayFile(null);
      alert('Proof submitted. An admin will verify and unlock the content.');
    } catch (e) {
      alert(e?.response?.data?.message || 'Submit failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  const groupedLibrary = useMemo(() => {
    const byType = { textbook: [], quiz: [], video: [] };
    (library || []).forEach((it) => {
      const rawType = it?.contentType || it?.type;
      const ctype = typeof rawType === 'string' ? rawType.toLowerCase() : '';
      if (ctype && byType[ctype]) {
        byType[ctype].push(it);
      } else if (ctype) {
        // eslint-disable-next-line no-console
        console.warn('[StudentDashboard] Unknown content type:', ctype, it?.title);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[StudentDashboard] Missing contentType/type:', it);
      }
    });
    // eslint-disable-next-line no-console
    console.log('[StudentDashboard] Grouped — textbooks:', byType.textbook.length, 'quizzes:', byType.quiz.length, 'videos:', byType.video.length);
    return byType;
  }, [library]);

  const tutorSubjects = useMemo(() => {
    const set = new Set();
    (tutors || []).forEach((t) => (t.subjects || []).forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [tutors]);

  const filteredTutors = useMemo(() => {
    const term = tutorSearch.trim().toLowerCase();
    const max = priceMax ? Number(priceMax) : null;
    return (tutors || []).filter((t) => {
      const nameOk = !term || (t.fullName || '').toLowerCase().includes(term);
      const subjectOk = !subjectFilter || (t.subjects || []).includes(subjectFilter);
      const priceOk = !max || (t.hourlyRate || 0) <= max;
      return nameOk && subjectOk && priceOk;
    });
  }, [tutors, tutorSearch, subjectFilter, priceMax]);

  const handleLogout = () => {
    localStorage.removeItem('ethioBooksToken');
    localStorage.removeItem('ethioBooksUser');
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-sm">
      <ContentViewer
        isOpen={contentViewerOpen}
        onClose={() => setContentViewerOpen(false)}
        item={selectedContent}
        isPremiumUser={isPremium}
      />

      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        userId={user?._id}
        onUpgradeComplete={refreshUserData}
      />

      {paymentModal.open && paymentModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-gray-900">Pay for content</h3>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-bold">{paymentModal.item.title}</span> — send payment ({paymentModal.price}{' '}
              ETB), then upload a screenshot of your transaction.
            </p>
            <input
              type="file"
              accept="image/*"
              className="mt-4 w-full text-xs"
              onChange={(e) => setPayFile(e.target.files?.[0] || null)}
            />
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPaymentModal({ open: false, item: null, price: 0 })}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={paySubmitting}
                onClick={submitPaymentProof}
                className="rounded-xl px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                {paySubmitting ? 'Submitting…' : 'Submit proof'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="w-full bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-12 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: PRIMARY_BLUE }}>
              Ethio Books
            </h1>
            <p className="text-xs text-gray-500">
              Welcome{user ? `, ${user.fullName}` : ''} — Grade {grade}
              {isPremium ? (
                <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  Premium
                </span>
              ) : (
                <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700">
                  Free
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell token={token} />
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 lg:px-12 py-6 space-y-8">
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-800">Error</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2">
          {[
            { id: 'library', label: 'Library' },
            { id: 'tutors', label: 'Tutors' },
            { id: 'bookings', label: 'My Bookings' },
            { id: 'messages', label: 'Messages' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === t.id ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'library' && (
          <section className="space-y-6">
            {!isPremium && (
              <div className="rounded-3xl px-6 py-6 sm:px-8 sm:py-8 shadow-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: PRIMARY_BLUE }}>
                    Unlock premium textbooks and quizzes
                  </p>
                  <p className="text-xs text-blue-900/80 mt-1 max-w-xl">
                    Upgrade to Premium for full access across all grades and materials.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-md hover:shadow-lg transition"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                  onClick={() => {
                    if (!user?._id) {
                      toast.error('Please log in again.');
                      return;
                    }
                    setShowPremiumModal(true);
                  }}
                >
                  Upgrade Now
                </button>
              </div>
            )}

            {['textbook', 'quiz', 'video'].map((type) => (
              <div key={type} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold tracking-tight text-gray-900">
                    {type === 'textbook' ? 'Textbooks' : type === 'quiz' ? 'Quizzes' : 'Videos'}
                  </h2>
                  <span className="text-xs text-gray-500">Grade {grade}</span>
                </div>

                {groupedLibrary[type].length === 0 ? (
                  <p className="text-xs text-gray-400 py-4">No {type}s available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedLibrary[type].map((it) => (
                      <div key={it._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-lg transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-gray-900 truncate">{it.title}</p>
                            <p className="mt-1 text-xs text-gray-500">{it.subject} • Grade {it.grade}</p>
                          </div>
                          {it.accessType === 'paid' ? (
                            <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800">
                              Paid{it.priceEtb ? ` ${it.priceEtb}` : ''} ETB
                            </span>
                          ) : it.isPremium ? (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-700">Premium</span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Free</span>
                          )}
                        </div>
                        {it.description ? <p className="mt-3 text-xs text-gray-600 line-clamp-3">{it.description}</p> : null}
                        <button
                          type="button"
                          onClick={() => openContent(it)}
                          className="mt-4 w-full rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md transition"
                          style={{ backgroundColor: PRIMARY_BLUE }}
                        >
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {tab === 'tutors' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={tutorSearch}
                  onChange={(e) => setTutorSearch(e.target.value)}
                  placeholder="Search by tutor name..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                />
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                >
                  <option value="">All subjects</option>
                  {tutorSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Max price (ETB/hr)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTutors.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600">
                  No tutors match your filters.
                </div>
              ) : (
                filteredTutors.map((t) => (
                  <div key={t._id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg transition">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-gray-900">{t.fullName}</p>
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                        ★ {(t.averageRating ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {Array.isArray(t.subjects) && t.subjects.length ? t.subjects.join(', ') : 'No subjects listed'}
                    </p>
                    <p className="mt-3 text-xs text-gray-600 line-clamp-3">
                      {t.bio || t.achievements || 'No bio provided.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm font-extrabold" style={{ color: PRIMARY_BLUE }}>
                        {t.hourlyRate ? `${t.hourlyRate} ETB/hr` : '—'}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/tutor/${t._id}`)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {tab === 'bookings' && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold tracking-tight text-gray-900">My Bookings</h2>
              <button
                type="button"
                onClick={fetchAll}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                Refresh
              </button>
            </div>

            {bookings.length === 0 ? (
              <p className="text-sm text-gray-600">
                No bookings yet. Open a tutor profile from the Tutors tab and use Book Session.
              </p>
            ) : (
              <ul className="space-y-3">
                {bookings.map((b) => (
                  <li key={b._id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">{b.subject}</p>
                        <p className="text-xs text-gray-500">
                          Tutor: {b.tutorId?.fullName || '—'} • {new Date(b.date).toLocaleString()} • {b.duration} min
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          statusStyles[b.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      Amount: <span className="font-bold text-gray-900">{b.amount} ETB</span>
                    </p>
                    {b.status === 'completed' && !b.rating && (
                      <button
                        type="button"
                        onClick={() => alert('Rating UI coming next. (API ready: POST /api/bookings/:id/rating)')}
                        className="mt-3 rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md"
                        style={{ backgroundColor: PRIMARY_BLUE }}
                      >
                        Rate Session
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'messages' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold tracking-tight text-gray-900">Ethio Books Help Center</h2>
              <p className="mt-1 text-sm text-gray-600">
                Free and premium students can reach platform support here. Messages alert admins in Live Monitoring.
              </p>
              {helpAdmin?._id ? (
                <div className="mt-4">
                  <ChatWindow
                    otherUserId={helpAdmin._id}
                    otherUserName={helpAdmin.fullName || 'Ethio Books Support'}
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-amber-700">Help Center admin is not configured.</p>
              )}
            </div>

            {isPremium ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold tracking-tight text-gray-900">Message a tutor</h2>
                <p className="mt-1 text-sm text-gray-600">Choose a tutor to start a direct conversation.</p>
                <select
                  className="mt-3 w-full max-w-md rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                  value={dmTutorId}
                  onChange={(e) => setDmTutorId(e.target.value)}
                >
                  <option value="">Select a tutor…</option>
                  {(tutors || []).map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
                {dmTutorId ? (
                  <div className="mt-4 max-w-lg">
                    <ChatWindow
                      otherUserId={dmTutorId}
                      otherUserName={
                        tutors.find((x) => String(x._id) === String(dmTutorId))?.fullName || 'Tutor'
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-700">
                Premium students can message tutors directly. Use Help Center above for all support requests.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;