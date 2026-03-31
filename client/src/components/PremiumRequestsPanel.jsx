import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, Check, X } from 'lucide-react';

const PRIMARY_BLUE = '#007BFF';
const API_BASE = process.env.REACT_APP_API_URL || 'https://ethio-books.onrender.com';

const PremiumRequestsPanel = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksToken') : null;
  const api = useMemo(() => {
    return axios.create({
      baseURL: `${API_BASE}/api`,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [token]);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, requestId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/premium/requests/pending');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching requests:', error?.response?.data || error);
      toast.error('Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (requestId) => {
    try {
      setSubmitting(true);
      await api.put(`/premium/requests/${requestId}/approve`);
      toast.success('Premium request approved!');
      await fetchRequests();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const openReject = (requestId) => {
    setRejectModal({ open: true, requestId });
    setRejectReason('');
  };

  const submitReject = async () => {
    if (!rejectModal.requestId) return;
    try {
      setSubmitting(true);
      await api.put(`/premium/requests/${rejectModal.requestId}/reject`, { reason: rejectReason });
      toast.success('Request rejected');
      setRejectModal({ open: false, requestId: null });
      setRejectReason('');
      await fetchRequests();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
        <p className="text-sm text-gray-600">Loading premium requests…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rejectModal.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
            <div className="p-7 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-gray-900">Reject premium request</h3>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, requestId: null })}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-7">
              <label className="block text-sm font-bold text-gray-700 mb-2">Reason (optional)</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm"
                placeholder="Payment proof could not be verified…"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, requestId: null })}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReject}
                  disabled={submitting}
                  className="rounded-xl px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  {submitting ? 'Submitting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Pending Premium Requests</h2>
            <p className="mt-1 text-sm text-gray-500">Review screenshot proofs and approve premium upgrades.</p>
          </div>
          <button
            type="button"
            onClick={fetchRequests}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/40 p-10 text-center text-gray-600">
            No pending premium requests.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {requests.map((req) => (
              <div key={req._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900">{req.studentId?.fullName || 'Student'}</p>
                    <p className="text-xs text-gray-500">
                      {req.studentId?.phone || '—'} {req.studentId?.grade ? `• Grade ${req.studentId.grade}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                      <span className="font-bold text-gray-800">Method:</span> {req.paymentMethod}
                      <br />
                      <span className="font-bold text-gray-800">Account:</span> {req.accountNumber}
                    </p>
                    {req.screenshotUrl ? (
                      <a
                        href={req.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:underline"
                        style={{ color: PRIMARY_BLUE }}
                      >
                        <Eye className="w-4 h-4" /> View Screenshot
                      </a>
                    ) : null}
                  </div>
                  <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">
                    Pending
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleApprove(req._id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                    style={{ backgroundColor: PRIMARY_BLUE }}
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => openReject(req._id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumRequestsPanel;

