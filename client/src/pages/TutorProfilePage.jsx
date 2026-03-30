import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ContentViewer from '../components/ContentViewer';
import BookingModal from '../components/BookingModal';
import PaymentModal from '../components/PaymentModal';

const PRIMARY_BLUE = '#007BFF';

const isPaidContentItem = (c) => c.accessType === 'paid' || c.isPremium === true;

/** Normalize YouTube URLs to embed form for iframe */
const toYouTubeEmbed = (url) => {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (u.includes('youtube.com/embed/')) return u.split('&')[0];
  const vParam = u.match(/[?&]v=([^&]+)/);
  if (vParam) return `https://www.youtube.com/embed/${vParam[1]}`;
  const short = u.match(/youtu\.be\/([^/?]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  return u;
};

const TutorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState('');
  const [contentError, setContentError] = useState('');

  const [contentViewerOpen, setContentViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);
  const [tutorContent, setTutorContent] = useState([]);
  const [expandedCourseId, setExpandedCourseId] = useState('');

  const [bookingOpen, setBookingOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [selectedPaidContent, setSelectedPaidContent] = useState(null);
  const [pendingPurchases, setPendingPurchases] = useState([]); // contentId[]
  const [paidAccessById, setPaidAccessById] = useState({}); // contentId => 'approved' | 'needsPayment'
  //const [paidAccessChecking, setPaidAccessChecking] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksToken') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksUser') : null;
  const user = useMemo(() => {
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  }, [storedUser]);
  const isPremium = !!user?.isPremium;

  const api = useMemo(
    () =>
      axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    [token]
  );

  /** Backend returns only approved items; do not re-filter using (status || moderation) — that breaks when status is still "pending" but moderation is "approved". */
  const fetchTutor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`http://localhost:5000/api/content/tutors/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTutor(res.data);
    } catch (err) {
      console.error('Tutor profile fetch:', err?.response?.data || err);
      setError(err?.response?.data?.message || 'Could not load this tutor.');
      setTutor(null);
      setTutorContent([]);
      setContentError('');
      setContentLoading(false);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  const fetchTutorContent = useCallback(async () => {
    if (!id) return;
    setContentLoading(true);
    setContentError('');
    try {
      const cRes = await axios.get(`http://localhost:5000/api/content/tutor/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const rows = Array.isArray(cRes.data) ? cRes.data : [];
      // eslint-disable-next-line no-console
      console.log('[TutorProfilePage] GET /api/content/tutor/:id raw count:', rows.length, rows);
      rows.forEach((c, i) => {
        // eslint-disable-next-line no-console
        console.log(`[TutorProfilePage] item ${i}`, {
          title: c.title,
          status: c.status,
          moderationStatus: c.moderationStatus,
          accessType: c.accessType,
          isPremium: c.isPremium
        });
      });
      const freeN = rows.filter((c) => !isPaidContentItem(c)).length;
      const paidN = rows.filter(isPaidContentItem).length;
      // eslint-disable-next-line no-console
      console.log('[TutorProfilePage] free/paid split', { free: freeN, paid: paidN });
      setTutorContent(rows);
    } catch (err) {
      console.error('Tutor content fetch:', err?.response?.data || err);
      setContentError(err?.response?.data?.message || "Could not load this tutor's published content.");
      setTutorContent([]);
    } finally {
      setContentLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    setTutorContent([]);
    setContentError('');
  }, [id]);

  useEffect(() => {
    fetchTutor();
  }, [fetchTutor]);

  useEffect(() => {
    if (tutor) fetchTutorContent();
  }, [tutor, fetchTutorContent]);

  const introEmbedUrl = useMemo(() => toYouTubeEmbed(tutor?.trialVideoUrl), [tutor?.trialVideoUrl]);

  const freeContent = useMemo(
    () => tutorContent.filter((c) => !isPaidContentItem(c)),
    [tutorContent]
  );
  const paidContent = useMemo(() => tutorContent.filter(isPaidContentItem), [tutorContent]);

  const checkPaidAccessStatuses = useCallback(async () => {
    if (!Array.isArray(paidContent) || paidContent.length === 0) {
      setPaidAccessById({});
      return;
    }

    setPaidAccessChecking(true);
    try {
      const results = {};
      await Promise.all(
        paidContent.map(async (item) => {
          try {
            await api.get(`/content/${item._id}`);
            results[item._id] = 'approved';
          } catch (err) {
            // Backend responds with { needsPayment: true } when payment is not approved yet.
            const status = err?.response?.status;
            if (status === 403 && err?.response?.data?.needsPayment) {
              results[item._id] = 'needsPayment';
            } else {
              results[item._id] = 'needsPayment';
            }
          }
        })
      );
      setPaidAccessById(results);
    } finally {
      setPaidAccessChecking(false);
    }
  }, [paidContent, api]);

  useEffect(() => {
    checkPaidAccessStatuses();
  }, [checkPaidAccessStatuses, pendingPurchases]);

  useEffect(() => {
    // Stop treating items as "pending" once we detect unlock is available.
    setPendingPurchases((prev) => prev.filter((id) => paidAccessById[id] !== 'approved'));
  }, [paidAccessById]);

  useEffect(() => {
    if (pendingPurchases.length === 0) return;
    const interval = setInterval(() => {
      checkPaidAccessStatuses();
    }, 30000);
    return () => clearInterval(interval);
  }, [pendingPurchases, checkPaidAccessStatuses]);

  const openFreeTrialViewer = () => {
    if (!introEmbedUrl) return;
    setViewerItem({
      title: `${tutor?.fullName || 'Tutor'} — Intro session`,
      subject: 'Introduction',
      grade: 10,
      contentType: 'video',
      videoUrl: introEmbedUrl,
      isPremium: false,
      description: 'Watch this free intro from the tutor.'
    });
    setContentViewerOpen(true);
  };

  const openContentViewer = (item) => {
    const v =
      item.contentType === 'video' && item.videoUrl
        ? { ...item, videoUrl: toYouTubeEmbed(item.videoUrl) }
        : item;
    setViewerItem(v);
    setContentViewerOpen(true);
  };

  const createBooking = async (payload) => {
    await api.post('/bookings', payload);
  };

  const initials = (tutor?.fullName || 'T').trim().charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-sm">
          <p className="text-sm font-medium text-gray-600">Loading tutor profile…</p>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-red-50 p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-red-800">{error || 'Tutor not found.'}</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: PRIMARY_BLUE }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-sm text-gray-900">
      <ContentViewer
        isOpen={contentViewerOpen}
        onClose={() => {
          setContentViewerOpen(false);
          setViewerItem(null);
        }}
        item={viewerItem}
        isPremiumUser={isPremium}
      />

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        tutor={tutor}
        onSubmit={createBooking}
      />

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        content={selectedPaidContent}
        tutor={tutor}
        onPaymentSubmitted={(contentId) => {
          setPendingPurchases((prev) => (prev.includes(contentId) ? prev : [...prev, contentId]));
        }}
      />

      {dmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-gray-900">Message {tutor.fullName}</h3>
            <p className="mt-2 text-sm text-gray-600">
              Direct messaging will be available soon. For now, use Book Session to connect.
            </p>
            <button
              type="button"
              onClick={() => setDmOpen(false)}
              className="mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-xs font-bold text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          <span className="text-xs font-bold text-gray-500">Ethio Books</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-gray-900">{tutor.fullName}</h1>
                {tutor.isVerified && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700">
                ★ <span className="font-bold">{(tutor.averageRating ?? 0).toFixed(1)}</span>
                {typeof tutor.ratingsCount === 'number' ? (
                  <span className="text-gray-500"> ({tutor.ratingsCount} reviews)</span>
                ) : null}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Education:</span> {tutor.educationLevel || '—'}
              </p>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Subjects</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(tutor.subjects || []).length ? (
                    tutor.subjects.map((s) => (
                      <span
                        key={s}
                        className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No subjects listed.</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">About</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {tutor.bio || tutor.achievements || 'This tutor has not added a bio yet.'}
                </p>
              </div>
            </div>
          </div>

          {tutor.trialVideoUrl ? (
            <div className="mt-8">
              <p className="text-sm font-extrabold text-gray-900">Intro video</p>
              {introEmbedUrl ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-black">
                  <div className="relative pb-[56.25%]">
                    <iframe
                      title="Tutor intro"
                      className="absolute inset-0 h-full w-full"
                      src={introEmbedUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">Preview not available for this link format.</p>
              )}
              <p className="mt-2 break-all text-xs text-gray-500">
                <span className="font-semibold text-gray-600">URL: </span>
                <a
                  href={tutor.trialVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {tutor.trialVideoUrl}
                </a>
              </p>
            </div>
          ) : (
            <p className="mt-8 text-sm text-gray-500">No intro video uploaded yet.</p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:shadow-md"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              Book Session
            </button>
            <button
              type="button"
              onClick={() => setDmOpen(true)}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
            >
              Send Message
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900">Free trial</h2>
            <p className="mt-2 text-sm text-gray-600">
              Watch the tutor&apos;s intro in the viewer for the full-screen experience, or use the inline player above.
            </p>
            <button
              type="button"
              disabled={!introEmbedUrl}
              onClick={openFreeTrialViewer}
              className="mt-5 w-full rounded-xl py-3 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              {introEmbedUrl ? 'Open in content viewer' : 'No trial video available'}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900">Free content</h2>
            <p className="mt-2 text-sm text-gray-600">Approved free materials from this tutor.</p>
            {contentLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading published content…</p>
            ) : contentError ? (
              <p className="mt-4 text-sm text-red-600">{contentError}</p>
            ) : freeContent.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No free content published yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {freeContent.map((item) => (
                  <li
                    key={item._id}
                    className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 shadow-sm"
                  >
                    <p className="text-sm font-extrabold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {(item.contentType || item.type || 'content').toUpperCase()} • {item.subject} • Grade{' '}
                      {item.grade}
                    </p>
                    {item.description ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600">{item.description}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openContentViewer(item)}
                      className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-800 shadow-sm hover:bg-gray-50"
                    >
                      Access
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-gray-900">Paid content</h2>
          <p className="mt-2 text-sm text-gray-600">Unlock approved paid materials and courses from this tutor.</p>
          {contentLoading ? (
            <p className="mt-4 text-sm text-gray-500">Loading published content…</p>
          ) : contentError ? (
            <p className="mt-4 text-sm text-red-600">{contentError}</p>
          ) : paidContent.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No paid content published yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {paidContent.map((item) => {
                const isExpanded = expandedCourseId === item._id;
                const sections = Array.isArray(item?.courseData?.sections) ? item.courseData.sections : [];
                const price = item.priceEtb ?? 50;
                return (
                  <div key={item._id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-gray-900">{item.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {(item.contentType || item.type || 'content').toUpperCase()} • {item.subject} • Grade{' '}
                          {item.grade}
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-800">{price} ETB</p>
                      </div>
                      {pendingPurchases.includes(item._id) ? (
                        <button
                          type="button"
                          disabled
                          className="shrink-0 rounded-lg px-4 py-2 text-xs font-extrabold text-gray-500 bg-gray-100 cursor-not-allowed"
                        >
                          Pending approval
                        </button>
                      ) : paidAccessById[item._id] === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => openContentViewer(item)}
                          className="shrink-0 rounded-lg px-4 py-2 text-xs font-extrabold text-white shadow-sm"
                          style={{ backgroundColor: PRIMARY_BLUE }}
                        >
                          Open
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaidContent(item);
                            setPaymentOpen(true);
                          }}
                          className="shrink-0 rounded-lg px-4 py-2 text-xs font-extrabold text-white shadow-sm"
                          style={{ backgroundColor: PRIMARY_BLUE }}
                        >
                          Purchase Access
                        </button>
                      )}
                    </div>
                    {item.description ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600">{item.description}</p>
                    ) : null}
                    {sections.length > 0 ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setExpandedCourseId(isExpanded ? '' : item._id)}
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          {isExpanded ? 'Hide curriculum' : 'View curriculum'}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            {sections.map((section, sIdx) => (
                              <div key={`${item._id}-s-${sIdx}`} className="rounded-lg border border-gray-200 bg-white p-3">
                                <p className="text-xs font-extrabold text-gray-900">{section.sectionTitle}</p>
                                <ul className="mt-2 space-y-1">
                                  {(section.lessons || []).map((lesson, lIdx) => (
                                    <li key={`${item._id}-l-${sIdx}-${lIdx}`} className="text-xs text-gray-600">
                                      {lIdx + 1}. {lesson.title} ({lesson.type}
                                      {lesson.duration ? ` • ${lesson.duration}` : ''}) - Locked
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TutorProfilePage;
