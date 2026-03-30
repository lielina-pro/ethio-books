import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const PRIMARY_BLUE = '#007BFF';

const featureItems = [
  {
    title: 'Verified Tutors',
    desc: 'Learn from reviewed tutors with strong subject backgrounds and trial videos.',
    icon: '✅'
  },
  {
    title: 'Grade-Based Learning',
    desc: 'Find materials and tutoring aligned with Grades 7-12 and your goals.',
    icon: '🎯'
  },
  {
    title: 'Secure Learning Hub',
    desc: 'Access organized content, resources, and tutor communication in one place.',
    icon: '🔒'
  },
  {
    title: 'Flexible Schedule',
    desc: 'Choose tutors and learning times that match your study routine.',
    icon: '🗓️'
  }
];

const steps = {
  student: [
    'Create your account and set your grade.',
    'Browse tutors and preview trial videos.',
    'Choose a tutor and start learning with guided content.'
  ],
  tutor: [
    'Register as a tutor and upload your documents.',
    'Wait for admin review and profile approval.',
    'Start teaching, share materials, and grow your learners.'
  ]
};

const testimonials = [
  {
    name: 'Mekdes A.',
    role: 'Grade 10 Student',
    quote: 'Ethio Books helped me understand physics with the right tutor and simple lessons.'
  },
  {
    name: 'Abel T.',
    role: 'Parent',
    quote: 'The platform made it easy to find trusted tutors and track progress at home.'
  },
  {
    name: 'Sara M.',
    role: 'Tutor',
    quote: 'I can share my teaching style clearly and connect with serious students quickly.'
  }
];

const LandingPage = () => {
  const [flowRole, setFlowRole] = useState('student');

  const navLinks = useMemo(
    () => [
      { label: 'Home', href: '#home' },
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'For Tutors', href: '#for-tutors' },
      { label: 'Contact', href: '#contact' }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 scroll-smooth">
      <header className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#home" className="text-2xl font-extrabold tracking-tight" style={{ color: PRIMARY_BLUE }}>
            Ethio Books
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-gray-600 transition hover:text-gray-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth?tab=login"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Login
            </Link>
            <Link
              to="/auth?tab=register"
              className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
              Ethiopia Learning Platform
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Learn from Ethiopia&apos;s Best Tutors
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
              Connect with trusted tutors, access quality materials, and build confidence in every subject from Grade 7 to Grade 12.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth?tab=register"
                className="rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Find a Tutor
              </Link>
              <Link
                to="/auth?tab=register&role=tutor"
                className="rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-800 transition hover:border-gray-300 hover:bg-gray-100"
              >
                Become a Tutor
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-2xl shadow-blue-900/5">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Ethio Books Intro"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Why Students Choose Ethio Books</h2>
            <p className="mt-3 text-gray-600">Everything you need to learn faster with confidence.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featureItems.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-white/70 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">How It Works</h2>
              <p className="mt-3 text-gray-600">Simple steps for both students and tutors.</p>
            </div>

            <div className="mx-auto mb-8 flex w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100/80 p-1.5">
              <button
                type="button"
                onClick={() => setFlowRole('student')}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  flowRole === 'student' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                For Students
              </button>
              <button
                type="button"
                onClick={() => setFlowRole('tutor')}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  flowRole === 'tutor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                For Tutors
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {steps[flowRole].map((step, index) => (
                <div key={step} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <span
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                    style={{ backgroundColor: PRIMARY_BLUE }}
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="for-tutors" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-8 shadow-xl sm:p-10 lg:p-12">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Share Your Knowledge. Inspire the Next Generation.</h2>
              <p className="mt-3 text-gray-600">
                Join Ethio Books as a tutor, grow your teaching brand, and help students across Ethiopia excel academically.
              </p>
              <Link
                to="/auth?tab=register&role=tutor"
                className="mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:shadow-lg"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Apply as Tutor
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white/70 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">What People Are Saying</h2>
              <p className="mt-3 text-gray-600">Early testimonials from our learning community.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((item) => (
                <article key={item.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white"
                      style={{ backgroundColor: PRIMARY_BLUE }}
                    >
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.role}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">&quot;{item.quote}&quot;</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="text-xl font-extrabold" style={{ color: PRIMARY_BLUE }}>Ethio Books</h3>
            <p className="mt-3 text-sm text-gray-600">Helping Ethiopian students learn with confidence through quality tutoring.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Platform</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><a href="#features" className="hover:text-gray-900">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-gray-900">How It Works</a></li>
              <li><a href="#for-tutors" className="hover:text-gray-900">For Tutors</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>support@ethiobooks.com</li>
              <li>+251 900 000 000</li>
              <li>Addis Ababa, Ethiopia</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Follow</p>
            <div className="mt-3 flex gap-2">
              {['FB', 'TG', 'YT'].map((item) => (
                <span key={item} className="inline-flex rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Ethio Books. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

