import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const PRIMARY_BLUE = '#007BFF';

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState('register'); // 'login' | 'register'
  const [role, setRole] = useState('student'); // 'student' | 'tutor'
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const roleParam = searchParams.get('role');

    if (tab === 'login') {
      setAuthMode('login');
    } else if (tab === 'register') {
      setAuthMode('register');
    }

    if (roleParam === 'tutor') {
      setRole('tutor');
    } else if (roleParam === 'student') {
      setRole('student');
    }
  }, [searchParams]);

  // Shared fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');

  // Student fields
  const [grade, setGrade] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Tutor fields
  const [telegram, setTelegram] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [achievements, setAchievements] = useState('');
  const [docsFiles, setDocsFiles] = useState([]);
  const [trialVideoUrl, setTrialVideoUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === 'register') {
        const formData = new FormData();

        formData.append('fullName', fullName);
        formData.append('phone', phone);
        formData.append('password', password);
        formData.append('role', role);

        if (age) formData.append('age', age);
        if (gender) formData.append('gender', gender);

        if (role === 'student') {
          if (grade) formData.append('grade', grade);
          if (schoolName) formData.append('schoolName', schoolName);
        }

        if (role === 'tutor') {
          formData.append('email', email);
          formData.append('telegramUsername', telegram);
          if (educationLevel) formData.append('educationLevel', educationLevel);
          if (achievements) formData.append('achievements', achievements);
          if (trialVideoUrl) formData.append('trialVideoUrl', trialVideoUrl);

          docsFiles.forEach((file) => {
            formData.append('docs', file);
          });
        }

        const registerUrl =
          role === 'tutor'
            ? 'http://localhost:5000/api/auth/register-tutor'
            : 'http://localhost:5000/api/auth/register';

        const response = await axios.post(
          registerUrl,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        const { token, user } = response.data;

        if (token) {
          localStorage.setItem('ethioBooksToken', token);
        }
        if (user) {
          localStorage.setItem('ethioBooksUser', JSON.stringify(user));
        }

        if (user?.role === 'tutor') {
          alert('Registration successful! Please wait for Admin approval.');
          navigate('/tutor');
        } else if (user?.role === 'student') {
          navigate('/dashboard');
        }
      } else {
        // Login
        const payload = {
          password
        };

        // Prefer email if it's a tutor, otherwise use phone
        if (role === 'tutor' && email) {
          payload.email = email;
        } else if (role === 'student' && phone) {
          payload.phone = phone;
        }

        const response = await axios.post(
          'http://localhost:5000/api/auth/login',
          payload
        );

        const { token, user } = response.data;

        if (token) {
          localStorage.setItem('ethioBooksToken', token);
        }
        if (user) {
          localStorage.setItem('ethioBooksUser', JSON.stringify(user));
        }

        if (user?.role === 'tutor') {
          // You can route tutors to a pending/overview page
          navigate('/tutor');
        } else if (user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message || 'Something went wrong. Please try again.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isTutor = role === 'tutor';
  const isStudent = role === 'student';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mx-auto">
        <div className="lg:col-span-2 -mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
        {/* Left: Branding / Info */}
        <div className="hidden lg:flex flex-col justify-center space-y-10">
          <div>
            <h1
              className="text-5xl lg:text-7xl font-extrabold tracking-tight drop-shadow-sm"
              style={{ color: PRIMARY_BLUE }}
            >
              Ethio Books
            </h1>
            <p className="mt-6 text-gray-600 text-lg lg:text-xl leading-relaxed max-w-xl">
              Learn and teach with Ethiopia&apos;s premier online tutoring platform.
              Join as a student to access premium lessons or become a tutor and share your knowledge.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-5">
              <span
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl text-white font-bold text-xl shadow-lg"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                1
              </span>
              <div className="mt-1">
                <p className="font-bold text-gray-900 text-lg">
                  Choose your role
                </p>
                <p className="text-gray-600 text-sm lg:text-base mt-1">
                  Switch between Student and Tutor to see tailored fields that match your needs.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-5">
              <span
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl text-white font-bold text-xl shadow-lg"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                2
              </span>
              <div className="mt-1">
                <p className="font-bold text-gray-900 text-lg">
                  Complete the form
                </p>
                <p className="text-gray-600 text-sm lg:text-base mt-1">
                  Provide accurate information securely so we can match you effectively.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-5">
              <span
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl text-white font-bold text-xl shadow-lg"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                3
              </span>
              <div className="mt-1">
                <p className="font-bold text-gray-900 text-lg">
                  Get started
                </p>
                <p className="text-gray-600 text-sm lg:text-base mt-1">
                  Students can instantly access lessons. Tutors are quickly reviewed and then activated.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-900/5 border border-gray-100 p-8 sm:p-12 lg:p-14 w-full max-w-2xl mx-auto">
          {/* Auth mode toggle (Login / Register) */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {authMode === 'register' ? 'Create Account' : 'Welcome Back'}
            </h2>
            <div className="flex text-sm bg-gray-100/80 rounded-full p-1 border border-gray-200/50">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`px-5 py-2.5 rounded-full transition-all duration-300 font-semibold ${
                  authMode === 'login'
                    ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-900/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`px-5 py-2.5 rounded-full transition-all duration-300 font-semibold ${
                  authMode === 'register'
                    ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-900/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Role Toggle (Student / Tutor) */}
          <div className="relative mb-10">
            <div className="flex bg-gray-100/80 rounded-2xl p-1.5 relative border border-gray-200/50">
              <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-md ring-1 ring-gray-900/5 transform transition-transform duration-300 ease-out ${
                  role === 'student' ? 'translate-x-0' : 'translate-x-[calc(100%+12px)]'
                }`}
              />
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`relative z-10 flex-1 text-center text-base font-bold py-3.5 rounded-xl transition-colors duration-300 ${
                  role === 'student'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole('tutor')}
                className={`relative z-10 flex-1 text-center text-base font-bold py-3.5 rounded-xl transition-colors duration-300 ${
                  role === 'tutor'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                👨‍🏫 Tutor
              </button>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Email (especially for tutors + login) */}
            {(!isStudent && authMode === 'login') || (isTutor && authMode === 'register') ? (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {isTutor ? 'Gmail Address' : 'Email Address'}
                </label>
                <input
                  type="email"
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                  placeholder={isTutor ? 'yourname@gmail.com' : 'you@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={(!isStudent && authMode === 'login') || (isTutor && authMode === 'register')}
                />
                {isTutor && authMode === 'register' && (
                  <p className="mt-2 text-sm text-gray-500 flex items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                    Tutors must register with a <span className="font-bold text-gray-700 ml-1">@gmail.com</span> address.
                  </p>
                )}
              </div>
            ) : null}

            {/* Phone */}
            {(isStudent || authMode === 'register') && (
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                    placeholder="+251 9..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={authMode === 'register' || isStudent}
                  />
                </div>

                {/* Age */}
                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      min="7"
                      max="90"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                      placeholder="e.g. 18"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Gender */}
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-700 cursor-pointer"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            )}

            {/* Student-specific fields (Register only) */}
            {authMode === 'register' && isStudent && (
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Grade
                  </label>
                  <select
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white text-gray-700 cursor-pointer"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    <option value="">Select grade</option>
                    {[7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    School Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                    placeholder="Your school name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Tutor-specific fields (Register only) */}
            {authMode === 'register' && isTutor && (
              <>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Telegram Username
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                      placeholder="@yourusername"
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                    />
                    <p className="mt-2 text-[13px] text-gray-500 flex items-center">
                      Must start with <span className="font-bold text-gray-700 mx-1">@</span>.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Education Level
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                      placeholder="e.g. BSc in Maths"
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Achievements (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400 resize-y"
                    placeholder="Olympiad awards, teaching experience, etc."
                    value={achievements}
                    onChange={(e) => setAchievements(e.target.value)}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Documents (Transcripts)
                    </label>
                    <input
                      type="file"
                      multiple
                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:text-white file:bg-blue-600 hover:file:bg-blue-700 transition-colors file:cursor-pointer cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-2 bg-gray-50/50 hover:bg-gray-100"
                      onChange={(e) => setDocsFiles(Array.from(e.target.files || []))}
                    />
                    <p className="mt-2 text-[13px] text-gray-500">
                      Upload certificates and degrees.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Trial Video URL
                    </label>
                    <input
                      type="url"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                      placeholder="https://youtube.com/watch?..."
                      value={trialVideoUrl}
                      onChange={(e) => setTrialVideoUrl(e.target.value)}
                    />
                    <p className="mt-2 text-[13px] text-gray-500">
                      Link to your demo teaching video.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                placeholder="Enter a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center px-6 py-4 text-lg font-extrabold rounded-xl text-white shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl disabled:cursor-not-allowed disabled:transform-none disabled:opacity-70 disabled:hover:shadow-none"
                style={{
                  backgroundColor: PRIMARY_BLUE,
                  boxShadow: isLoading ? 'none' : '0 10px 25px -5px rgba(0,123,255,0.4)'
                }}
              >
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isLoading
                  ? 'Processing...'
                  : authMode === 'register'
                  ? `Create ${role === 'student' ? 'Student' : 'Tutor'} Account`
                  : 'Sign In to Dashboard'}
              </button>
            </div>

            {/* Small helper text */}
            <p className="text-sm text-gray-500 text-center mt-6">
              By continuing, you agree to Ethio Books&apos;{' '}
              <a href="/terms" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">Terms of Service</a> and{' '}
              <a href="/privacy" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">Privacy Policy</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
