import React, { useEffect, useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PremiumUpgradeModal = ({ isOpen, onClose, userId, onUpgradeComplete }) => {
  const [step, setStep] = useState('options'); // 'options', 'upload', 'pending'
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('options');
    setSelectedMethod(null);
    setScreenshot(null);
    setUploading(false);
    setPaymentRequestId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const paymentOptions = [
    {
      name: 'Telebirr',
      account: '0992655103',
      instructions: 'Send payment to this Telebirr number and upload screenshot'
    },
    {
      name: 'CBE (Commercial Bank of Ethiopia)',
      account: '1000325439584',
      instructions: 'Send payment to this account and upload screenshot'
    }
  ];

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setStep('upload');
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmitPayment = async () => {
    if (!userId) {
      toast.error('User not found. Please log in again.');
      return;
    }
    if (!selectedMethod) {
      toast.error('Please select a payment method.');
      return;
    }
    if (!screenshot) {
      toast.error('Please upload payment screenshot');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('screenshot', screenshot);
    formData.append('paymentMethod', selectedMethod.name);
    formData.append('accountNumber', selectedMethod.account);

    try {
      const token = localStorage.getItem('ethioBooksToken');
      const res = await axios.post('http://localhost:5000/api/premium/request', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setPaymentRequestId(res.data?.requestId || null);
      setStep('pending');
      toast.success('Payment proof submitted! Admin will review shortly.');

      if (onUpgradeComplete) onUpgradeComplete();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Payment submission error:', error?.response?.data || error);
      toast.error(error?.response?.data?.message || 'Failed to submit payment proof');
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    setStep('options');
    setSelectedMethod(null);
    setScreenshot(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100 shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-gray-900">
            {step === 'options' && 'Upgrade to Premium'}
            {step === 'upload' && 'Submit Payment Proof'}
            {step === 'pending' && 'Payment Pending'}
          </h2>
          <button onClick={onClose} type="button" className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 'options' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">Choose your payment method to unlock premium features:</p>
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
            </div>
          )}

          {step === 'upload' && selectedMethod && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="font-bold text-blue-900">Send payment to:</p>
                <p className="text-lg font-extrabold text-blue-700 mt-1">{selectedMethod.name}</p>
                <p className="text-sm text-gray-600 mt-1">Account: {selectedMethod.account}</p>
                <p className="text-xs text-gray-500 mt-2">{selectedMethod.instructions}</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <input
                  type="file"
                  id="screenshot"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {screenshot ? (
                  <div className="space-y-2">
                    <p className="text-green-600 text-sm font-bold">✓ File selected: {screenshot.name}</p>
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="text-sm text-red-500 hover:text-red-600 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label htmlFor="screenshot" className="cursor-pointer block">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-semibold">Click to upload payment screenshot</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF accepted</p>
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  disabled={!screenshot || uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {uploading ? 'Submitting...' : 'Submit Proof'}
                </button>
              </div>
            </div>
          )}

          {step === 'pending' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">Payment Under Review</h3>
              <p className="text-gray-600 mb-4">
                Your payment proof has been submitted. Admin will verify and approve your premium access within 24
                hours.
              </p>
              <p className="text-sm text-gray-500">
                Request ID: <span className="font-bold">{paymentRequestId || '—'}</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-extrabold"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumUpgradeModal;

