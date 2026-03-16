import React, { useMemo, useState } from 'react';

const PRIMARY_BLUE = '#007BFF';

const sampleMaterials = [
  {
    id: 1,
    title: 'Grade 7 Mathematics – Algebra Basics',
    subject: 'Maths',
    type: 'textbook',
    grade: 7
  },
  {
    id: 2,
    title: 'Grade 9 Biology – Cells and Systems',
    subject: 'Biology',
    type: 'textbook',
    grade: 9
  },
  {
    id: 3,
    title: 'Physics Quiz – Motion and Forces',
    subject: 'Physics',
    type: 'quiz',
    grade: 10
  },
  {
    id: 4,
    title: 'Chemistry Quiz – Atomic Structure',
    subject: 'Chemistry',
    type: 'quiz',
    grade: 11
  },
  {
    id: 5,
    title: 'Video Tutor – Calculus Concepts',
    subject: 'Maths',
    type: 'video',
    grade: 12
  },
  {
    id: 6,
    title: 'Video Tutor – Physics Problem Solving',
    subject: 'Physics',
    type: 'video',
    grade: 10
  }
];

const Library = () => {
  let user = null;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ethioBooksUser');
    if (stored) {
      try {
        user = JSON.parse(stored);
      } catch {
        user = null;
      }
    }
  }

  const studentGrade = user?.grade || 7;
  const isPremium = !!user?.isPremium;

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sampleMaterials.filter((item) => {
      if (!term) return true;
      const inTitle = item.title.toLowerCase().includes(term);
      const inSubject = item.subject.toLowerCase().includes(term);
      return inTitle || inSubject;
    });
  }, [search]);

  const grouped = useMemo(() => {
    const byType = {
      textbook: [],
      quiz: [],
      video: []
    };
    filtered.forEach((item) => {
      if (byType[item.type]) {
        byType[item.type].push(item);
      }
    });
    return byType;
  }, [filtered]);

  const renderCardGrid = (items, label) => {
    if (!items || items.length === 0) {
      return (
        <p className="text-[11px] text-gray-400 py-3">
          No {label.toLowerCase()} found for this search.
        </p>
      );
    }

    return (
      <div className="grid xs:grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const locked = !isPremium && item.grade !== studentGrade;
          return (
            <div
              key={item.id}
              className="relative border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 px-3 py-3 flex flex-col"
            >
              {locked && (
                <span className="absolute top-2 right-2 text-xs" title="Premium only">
                  🔒
                </span>
              )}
              <p className="text-xs font-semibold text-gray-800 pr-4">
                {item.title}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Subject: <span className="font-medium">{item.subject}</span> • Grade{' '}
                {item.grade}
              </p>
              <button
                type="button"
                disabled={locked}
                className={`mt-2 inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold rounded-md shadow-sm transition ${
                  locked
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'text-white'
                }`}
                style={!locked ? { backgroundColor: PRIMARY_BLUE } : {}}
              >
                {locked ? 'Premium Required' : 'Open'}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-gray-900">Library</h2>
          <p className="text-[11px] text-gray-500">
            Explore textbooks, quizzes, and video tutors for your grade and beyond.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by subject or title..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-2">
        {/* Textbooks */}
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
            Textbooks
          </h3>
          {renderCardGrid(grouped.textbook, 'Textbooks')}
        </div>

        {/* Quizzes */}
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
            Quizzes
          </h3>
          {renderCardGrid(grouped.quiz, 'Quizzes')}
        </div>

        {/* Video Tutors */}
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
            Video Tutors
          </h3>
          {renderCardGrid(grouped.video, 'Video Tutors')}
        </div>
      </div>
    </section>
  );
};

export default Library;

