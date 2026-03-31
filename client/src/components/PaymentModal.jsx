import React, { useEffect, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PRIMARY_BLUE = '#007BFF';
const API_BASE = process.env.REACT_APP_API_URL || 'https://ethio-books.onrender.com';

const PaymentModal = ({ isOpen, onClose, content, tutor, onPaymentSubmitted }) => {
  const [step, setStep] = useState('options'); // 'options' | 'upload' | 'pending'
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [purchaseId, setPurchaseId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('options');
    setSelectedMethod(null);
    setScreenshot(null);
    setUploading(false);
    setPurchaseId(null);
  }, [isOpen]);

  if (!isOpen || !content || !tutor) return null;

  const amount = content.priceEtb ?? 50;
  const paymentOptions = [
    { name: 'Telebirr', account: '0992655103' },
    { name: 'CBE', account: '1000325439584' }
  ];

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setScreenshot(e.target.files[0]);
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('ethioBooksToken') : null;

  const handleSubmitPayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method.');
      return;
    }
    if (!screenshot) {
      toast.error('Please upload payment screenshot.');
      return;
    }

    setUploading(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[PaymentModal] Submitting payment for content:', content?._id);
      // eslint-disable-next-line no-console
      console.log('[PaymentModal] Content object:', content);

      if (!token) {
        toast.error('Please log in again (missing token).');
        return;
      }

      const formData = new FormData();
      formData.append('screenshot', screenshot);

      // Backend only requires screenshot for unlocking, but we also store these fields
      // for admin visibility/audit trail.
      formData.append('contentId', content._id);
      formData.append('tutorId', tutor._id);
      formData.append('amount', String(amount));
      formData.append('paymentMethod', selectedMethod.name);
      formData.append('accountNumber', selectedMethod.account);

      const res = await axios.post(`${API_BASE}/api/content/${content._id}/payment-proof`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      setPurchaseId(res.data?._id || null);
      setStep('pending');

      if (onPaymentSubmitted) {
        onPaymentSubmitted(content._id, res.data);
      }

      toast.success('Payment proof submitted! Waiting for admin approval.');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Payment proof submission failed:', error?.response?.data || error);
      toast.error(error?.response?.data?.message || 'Failed to submit payment proof');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-gray-900 truncate">
              {step === 'options' && `Pay for ${content.title}`}
              {step === 'upload' && 'Submit payment proof'}
              {step === 'pending' && 'Payment pending approval'}
            </h2>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Tutor: {tutor.fullName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 'options' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="font-bold text-blue-900">Amount: {amount} ETB</p>
                <p className="text-sm text-blue-800 mt-1">Send payment to one of these accounts and upload screenshot.</p>
              </div>

              {paymentOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => handleSelectMethod(option)}
                  className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <div className="font-extrabold text-gray-900">{option.name}</div>
                  <div className="text-sm text-gray-500 mt-1">Account: {option.account}</div>
                </button>
              ))}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  disabled={!selectedMethod}
                  className="rounded-xl px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60 shadow-sm"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  I have paid
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'upload' && selectedMethod && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="font-bold text-gray-900">{selectedMethod.name}</p>
                <p className="text-sm text-gray-600 mt-1">Account: {selectedMethod.account}</p>
                <p className="text-xs text-gray-500 mt-2">Amount: {amount} ETB</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <input
                  type="file"
                  id="payment-screenshot"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {screenshot ? (
                  <div>
                    <p className="text-green-700 text-sm font-bold">✓ Selected: {screenshot.name}</p>
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="text-sm text-red-600 mt-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label htmlFor="payment-screenshot" className="cursor-pointer block">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Click to upload payment screenshot</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF accepted</p>
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setStep('options')}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  disabled={!screenshot || uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-extrabold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {uploading ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {step === 'pending' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">Payment proof submitted</h3>
              <p className="text-gray-600 text-sm">
                Waiting for admin approval. You can close this window; you’ll receive a notification once approved or rejected.
              </p>
              {purchaseId ? <p className="mt-4 text-xs text-gray-500">Request: {purchaseId}</p> : null}

              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-xl px-4 py-3 text-xs font-extrabold text-white shadow-sm"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

