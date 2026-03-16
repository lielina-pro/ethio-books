import React, { useEffect, useRef } from 'react';

const PRIMARY_BLUE = '#007BFF';

const SecureViewer = ({ src, title = 'Secure Viewer', type = 'pdf' }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && (e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);

  const onContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={onContextMenu}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none select-none" />
      {type === 'video' ? (
        <iframe
          src={src}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <iframe
          src={src}
          title={title}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      )}
      <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[11px] font-semibold text-white shadow-sm" style={{ backgroundColor: PRIMARY_BLUE }}>
        Protected View
      </div>
    </div>
  );
};

export default SecureViewer;

