import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import Library from '../components/Library';
const PRIMARY_BLUE = '#007BFF';
const StudentDashboard = () => {

  const navigate = useNavigate();

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


  const studentGrade = Number(user?.grade) || 7;

  const isPremium = !!user?.isPremium;



  const [selectedGrade, setSelectedGrade] = useState(studentGrade);

  const [activeVideoUrl, setActiveVideoUrl] = useState('');

  const [toast, setToast] = useState(null);



  // Placeholder content data, filtered by grade

  const textbooks = useMemo(

    () =>

      [

        {

          id: 1,

          title: 'Grade 7 Mathematics Textbook',

          grade: 7,

          fileUrl: '#'

        },

        {

          id: 2,

          title: 'Grade 10 Physics Essentials',

          grade: 10,

          fileUrl: '#'

        },

        {

          id: 3,

          title: 'Grade 12 Biology Revision Notes',

          grade: 12,

          fileUrl: '#'

        }

      ].filter((item) => item.grade === Number(selectedGrade)),

    [selectedGrade]

  );



  const videoTutors = useMemo(

    () =>

      [

        {

          id: 1,

          title: 'Algebra Basics – Trial Class',

          grade: 7,

          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'

        },

        {

          id: 2,

          title: 'Grade 10 Chemistry Concepts',

          grade: 10,

          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'

        }

      ].filter((item) => item.grade === Number(selectedGrade)),

    [selectedGrade]

  );



  // Placeholder tutors (approved marketplace)

  const tutors = useMemo(

    () => [

      {

        id: 1,

        name: 'Abebe Bekele',

        rating: 4.8,

        about:

          'Passionate math tutor with 5+ years helping high school students excel.',

        achievements: 'National Math Olympiad finalist, former university TA.',

        trialVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'

      },

      {

        id: 2,

        name: 'Sara Mekonnen',

        rating: 4.9,

        about:

          'Physics and chemistry tutor focused on conceptual understanding.',

        achievements: 'Top 1% national exam scorer, STEM club mentor.',

        trialVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'

      }

    ],

    []

  );



  const handleWatchVideo = (url) => {

    setActiveVideoUrl(url);

  };



  const closeModal = () => {

    setActiveVideoUrl('');

  };



  useEffect(() => {

    if ('serviceWorker' in navigator) {

      navigator.serviceWorker.register('/service-worker.js').catch(() => { });

    }

  }, []);



  useEffect(() => {

    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('ethioBooksToken');

    if (!token) return;



    const socket = io('http://localhost:5000', {

      auth: { token }

    });



    socket.on('notification', (payload) => {

      setToast(payload);

      setTimeout(() => setToast(null), 4000);

    });



    return () => {

      socket.disconnect();

    };

  }, []);



  const handleLogout = () => {

    localStorage.removeItem('ethioBooksToken');

    localStorage.removeItem('ethioBooksUser');

    navigate('/');

  };



  return (

    <div className="min-h-screen bg-gray-50 text-sm">

      <header className="w-full bg-white shadow-sm">

        <div className="w-full px-6 lg:px-12 py-4 flex items-center justify-between">

          <div>

            <h1

              className="text-2xl font-bold tracking-tight"

              style={{ color: PRIMARY_BLUE }}

            >

              Ethio Books

            </h1>

            <p className="text-xs text-gray-500">

              Welcome{user ? `, ${user.fullName}` : ''} — Grade {studentGrade}

            </p>

          </div>



          <div className="flex items-center space-x-3">

            <button

              type="button"

              onClick={handleLogout}

              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition"

            >

              Log out

            </button>



            <span className="text-xs text-gray-500">Your grade</span>

            <select

              className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"

              value={selectedGrade}

              onChange={(e) => setSelectedGrade(e.target.value)}

            >

              {[7, 8, 9, 10, 11, 12].map((g) => (

                <option key={g} value={g}>

                  Grade {g}

                </option>

              ))}

            </select>

          </div>

        </div>

      </header>



      <main className="w-full px-6 lg:px-12 py-6 space-y-16">

        {toast && (

          <div className="fixed bottom-4 right-4 z-50 max-w-xs bg-white border border-blue-100 shadow-lg rounded-xl px-4 py-3 text-xs">

            <p className="font-semibold text-gray-800 mb-1">Notification</p>

            <p className="text-gray-600">{toast.message}</p>

            <button

              type="button"

              onClick={() => setToast(null)}

              className="mt-2 text-[11px] text-blue-600 hover:underline"

            >

              Dismiss

            </button>

          </div>

        )}

        {/* Premium Banner */}

        {!isPremium && (

          <div

            className="rounded-2xl px-6 py-6 sm:px-8 sm:py-8 shadow-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between"

            style={{ borderColor: PRIMARY_BLUE + '30' }}

          >

            <div>

              <p className="text-sm font-semibold" style={{ color: PRIMARY_BLUE }}>

                Unlock all materials and DM tutors with Premium!

              </p>

              <p className="text-xs text-blue-900/80 mt-1 max-w-xl">

                Get full access to textbooks, quizzes, and direct messaging with top

                tutors tailored to your grade.

              </p>

            </div>

            <button

              type="button"

              className="mt-3 sm:mt-0 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-md hover:shadow-lg transition"

              style={{ backgroundColor: PRIMARY_BLUE }}

            >

              Upgrade Now

            </button>

          </div>

        )}



        {/* Grade-based content */}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Educational Textbooks Base */}

          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 p-6">

            <div className="flex items-center justify-between mb-3">

              <h2 className="text-base font-bold tracking-tight text-gray-900">

                Educational Textbooks Base

              </h2>

              <span className="text-xs text-gray-500">

                Grade {selectedGrade}

              </span>

            </div>

            {textbooks.length === 0 ? (

              <p className="text-xs text-gray-400 py-4">

                No textbooks available for this grade yet.

              </p>

            ) : (

              <ul className="space-y-2 text-sm">

                {textbooks.map((book) => (

                  <li

                    key={book.id}

                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition"

                  >

                    <div>

                      <p className="font-medium text-gray-800">{book.title}</p>

                    </div>

                    <a

                      href={book.fileUrl}

                      target="_blank"

                      rel="noopener noreferrer"

                      className="text-xs font-semibold text-white px-3 py-1 rounded-md shadow-sm"

                      style={{ backgroundColor: PRIMARY_BLUE }}

                    >

                      Open

                    </a>

                  </li>

                ))}

              </ul>

            )}

          </div>



          {/* Video Tutors for this grade */}

          <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 p-6">

            <div className="flex items-center justify-between mb-3">

              <h2 className="text-base font-bold tracking-tight text-gray-900">

                Video Tutors

              </h2>

              <span className="text-xs text-gray-500">

                Grade {selectedGrade}

              </span>

            </div>

            {videoTutors.length === 0 ? (

              <p className="text-xs text-gray-400 py-4">

                No trial videos for this grade yet.

              </p>

            ) : (

              <ul className="space-y-2 text-xs">

                {videoTutors.map((video) => (

                  <li

                    key={video.id}

                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition"

                  >

                    <div>

                      <p className="font-medium text-gray-800">{video.title}</p>

                    </div>

                    <button

                      type="button"

                      onClick={() => handleWatchVideo(video.videoUrl)}

                      className="text-xs font-semibold text-white px-3 py-1 rounded-md shadow-sm"

                      style={{ backgroundColor: PRIMARY_BLUE }}

                    >

                      Watch

                    </button>

                  </li>

                ))}

              </ul>

            )}

          </div>

        </section>



        {/* Library */}

        <Library />



        {/* Tutor Marketplace */}

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

          <div className="flex items-center justify-between mb-3">

            <h2 className="text-base font-bold tracking-tight text-gray-900">

              Tutor Marketplace

            </h2>

            <span className="text-xs text-gray-500">

              Approved tutors you can learn from

            </span>

          </div>

          {tutors.length === 0 ? (

            <p className="text-xs text-gray-400 py-4">

              No tutors available yet. Check back soon.

            </p>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

              {tutors.map((tutor) => (

                <div

                  key={tutor.id}

                  className="border border-gray-100 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white flex flex-col p-4"

                >

                  <div className="flex items-center justify-between mb-2">

                    <h3 className="text-sm font-semibold text-gray-900">

                      {tutor.name}

                    </h3>

                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">

                      ★ {(tutor.averageRating ?? tutor.rating).toFixed(1)}

                    </span>

                  </div>

                  <p className="text-xs text-gray-600 mb-2 line-clamp-3">

                    {tutor.about}

                  </p>

                  <p className="text-[11px] text-gray-500 mb-3">

                    <span className="font-semibold">Special Achievements: </span>

                    {tutor.achievements}

                  </p>

                  <div className="mt-auto flex items-center justify-between space-x-2">

                    <button

                      type="button"

                      onClick={() => handleWatchVideo(tutor.trialVideoUrl)}

                      className="flex-1 text-[11px] font-semibold rounded-md px-3 py-1 text-white shadow-sm hover:shadow-md transition"

                      style={{ backgroundColor: PRIMARY_BLUE }}

                    >

                      Watch Trial Video

                    </button>

                    <button

                      type="button"

                      className="flex-1 text-[11px] font-semibold rounded-md px-3 py-1 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"

                    >

                      Buy Content

                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>



        {/* YouTube Modal */}

        {activeVideoUrl && (

          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">

            <div className="bg-black rounded-xl overflow-hidden max-w-3xl w-full mx-4 relative">

              <button

                type="button"

                onClick={closeModal}

                className="absolute top-2 right-2 z-10 text-white text-sm bg-black/50 rounded-full px-2 py-1 hover:bg-black/70"

              >

                Close

              </button>

              <div className="relative pb-[56.25%]">

                <iframe

                  src={activeVideoUrl}

                  title="Trial Video"

                  className="absolute inset-0 w-full h-full"

                  frameBorder="0"

                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"

                  allowFullScreen

                />

              </div>

            </div>

          </div>

        )}

      </main>

    </div>

  );

};



export default StudentDashboard;