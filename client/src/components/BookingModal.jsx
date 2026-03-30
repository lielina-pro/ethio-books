import React, { useMemo, useState } from 'react';

const PRIMARY_BLUE = '#007BFF';

const durations = [30, 60, 90, 120];

const BookingModal = ({ isOpen, onClose, tutor, onSubmit }) => {
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const subjects = useMemo(() => (Array.isArray(tutor?.subjects) ? tutor.subjects : []), [tutor]);
  const hourly = tutor?.hourlyRate || 0;

  const amount = useMemo(() => {
    const hours = duration / 60;
    return Math.round(hours * hourly);
  }, [duration, hourly]);

  if (!isOpen || !tutor) return null;

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 1);
  const minIso = minDate.toISOString().slice(0, 16);

  const submit = async () => {
    setLoading(true);
    try {
      await onSubmit?.({
        tutorId: tutor._id,
        subject,
        date,
        duration,
        amount
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Booking</p>
            <h3 className="mt-1 truncate text-lg font-extrabold text-gray-900">
              Book {tutor.fullName}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              onClose?.();
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-6">
          {done ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
              <p className="text-lg font-extrabold text-emerald-800">Booking request sent!</p>
              <p className="mt-2 text-sm text-emerald-700">You’ll see updates under “My Bookings”.</p>
              <button
                type="button"
                onClick={() => {
                  setDone(false);
                  onClose?.();
                }}
                className="mt-5 rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-md hover:shadow-lg"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Date & time</label>
                <input
                  type="datetime-local"
                  min={minIso}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Duration</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {durations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold border transition ${
                        duration === d
                          ? 'bg-blue-50 border-blue-100 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 text-sm">
                <p className="text-gray-600">
                  Hourly rate: <span className="font-extrabold text-gray-900">{hourly} ETB/hr</span>
                </p>
                <p className="mt-1 text-gray-600">
                  Total: <span className="font-extrabold" style={{ color: PRIMARY_BLUE }}>{amount} ETB</span>
                </p>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!subject || !date || loading}
                className={`w-full rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-md transition ${
                  !subject || !date || loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'
                }`}
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                {loading ? 'Submitting...' : 'Submit Booking'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;

