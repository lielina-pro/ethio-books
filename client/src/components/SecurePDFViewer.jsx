import React, { useEffect, useState } from 'react';

const PRIMARY_BLUE = '#007BFF';

const SecurePDFViewer = ({ src, title = 'Secure PDF' }) => {
  const [blobUrl, setBlobUrl] = useState('');

  useEffect(() => {
    let revokedUrl = '';

    const fetchPdf = async () => {
      try {
        const response = await fetch(src, { credentials: 'include' });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        revokedUrl = url;
      } catch (err) {
        console.error('Failed to load secure PDF:', err);
      }
    };

    fetchPdf();

    const handleKey = (e) => {
      if (e.ctrlKey && (e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [src]);

  const onContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden"
      onContextMenu={onContextMenu}
    >
      {!blobUrl ? (
        <p className="text-xs text-gray-300">Loading secure document...</p>
      ) : (
        <iframe
          src={blobUrl}
          title={title}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts"
        />
      )}
      <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[11px] font-semibold text-white shadow-sm" style={{ backgroundColor: PRIMARY_BLUE }}>
        Protected PDF
      </div>
    </div>
  );
};

export default SecurePDFViewer;

