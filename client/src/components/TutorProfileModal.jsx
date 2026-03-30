import React, { useMemo } from 'react';

const PRIMARY_BLUE = '#007BFF';

const TutorProfileModal = ({
  isOpen,
  onClose,
  tutor,
  onBook
}) => {
  const initials = useMemo(() => {
    const n = tutor?.fullName || 'Tutor';
    return n.trim().charAt(0).toUpperCase();
  }, [tutor]);

  if (!isOpen || !tutor) return null;

  const subjects = Array.isArray(tutor.subjects) ? tutor.subjects : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-extrabold text-lg"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-extrabold text-gray-900">{tutor.fullName}</h3>
              <p className="text-sm text-gray-600">
                ★ {(tutor.averageRating ?? 0).toFixed(1)} • {tutor.hourlyRate ? `${tutor.hourlyRate} ETB/hr` : 'Rate not set'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Subjects</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {subjects.length ? subjects.map((s) => (
                <span key={s} className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {s}
                </span>
              )) : (
                <p className="text-sm text-gray-600">No subjects listed.</p>
              )}
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <p><span className="font-semibold text-gray-700">Education:</span> <span className="text-gray-600">{tutor.educationLevel || '—'}</span></p>
              <p><span className="font-semibold text-gray-700">Verified:</span> <span className="text-gray-600">{tutor.isVerified ? 'Yes' : 'No'}</span></p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">About</p>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">
              {tutor.bio || tutor.achievements || 'No bio provided yet.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onBook?.(tutor)}
                className="rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Book Session
              </button>
              <button
                type="button"
                onClick={() => alert('Messaging is coming soon.')}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfileModal;

