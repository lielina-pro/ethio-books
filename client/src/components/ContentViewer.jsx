import React, { useMemo } from 'react';
import SimpleQuiz from './SimpleQuiz';

const PRIMARY_BLUE = '#007BFF';

const toGooglePdfEmbed = (pdfUrl) => {
  const encoded = encodeURIComponent(pdfUrl);
  return `https://docs.google.com/gview?embedded=1&url=${encoded}`;
};

const ContentViewer = ({ isOpen, onClose, item, isPremiumUser }) => {
  // Paid tutor content is delivered after payment verification (via ContentPurchase),
  // even if `isPremium` is set on the item. Only gate true premium-subscription content.
  const gated = !!item?.isPremium && !isPremiumUser && item?.accessType !== 'paid';

  const label = useMemo(() => {
    if (!item) return '';
    if (item.contentType === 'textbook') return 'Textbook';
    if (item.contentType === 'quiz') return 'Quiz';
    if (item.contentType === 'video') return 'Video';
    return 'Content';
  }, [item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
            <h3 className="mt-1 truncate text-lg font-extrabold text-gray-900">{item.title}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {item.subject} • Grade {item.grade}{' '}
              {item.isPremium ? (
                <span className="ml-2 inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-700">
                  Premium
                </span>
              ) : (
                <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  Free
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-6">
          {gated ? (
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-8">
              <h4 className="text-xl font-extrabold text-gray-900">Premium content</h4>
              <p className="mt-2 text-sm text-gray-600">
                Upgrade to Premium to access this content.
              </p>
              <button
                type="button"
                onClick={() => alert('Premium upgrade flow coming soon.')}
                className="mt-5 rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-md hover:shadow-lg"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Upgrade Now
              </button>
            </div>
          ) : (
            <>
              {item.description ? (
                <p className="mb-5 text-sm text-gray-600">{item.description}</p>
              ) : null}

              {item.contentType === 'textbook' && item.pdfUrl && (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/50">
                  <iframe
                    title="PDF Viewer"
                    className="h-[70vh] w-full"
                    src={toGooglePdfEmbed(item.pdfUrl)}
                  />
                </div>
              )}

              {item.contentType === 'video' && item.videoUrl && (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-black">
                  <div className="relative pb-[56.25%]">
                    <iframe
                      title="Video"
                      className="absolute inset-0 h-full w-full"
                      src={item.videoUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {item.contentType === 'quiz' && (
                <SimpleQuiz questions={item.quizData?.questions || []} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentViewer;

