import React, { useEffect, useState } from 'react';

const PRIMARY_BLUE = '#007BFF';

const SecureVideoPlayer = ({ src, title = 'Secure Video' }) => {
  const [blobUrl, setBlobUrl] = useState('');

  useEffect(() => {
    let revokedUrl = '';

    const fetchVideo = async () => {
      try {
        const response = await fetch(src, { credentials: 'include' });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        revokedUrl = url;
      } catch (err) {
        console.error('Failed to load secure video:', err);
      }
    };

    fetchVideo();

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
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
      onContextMenu={onContextMenu}
    >
      {!blobUrl ? (
        <p className="text-xs text-gray-300">Loading secure video...</p>
      ) : (
        <video
          src={blobUrl}
          controls
          controlsList="nodownload noplaybackrate"
          className="w-full h-full"
        />
      )}
      <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[11px] font-semibold text-white shadow-sm" style={{ backgroundColor: PRIMARY_BLUE }}>
        Protected Video
      </div>
    </div>
  );
};

export default SecureVideoPlayer;

