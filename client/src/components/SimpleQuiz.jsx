import React, { useMemo, useState } from 'react';

const PRIMARY_BLUE = '#007BFF';

const SimpleQuiz = ({ questions = [] }) => {
  const total = questions.length;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]); // { selected, correct }
  const [showResult, setShowResult] = useState(false);

  const current = questions[idx];

  const score = useMemo(() => {
    return answers.reduce((acc, a) => acc + (a.correct ? 1 : 0), 0);
  }, [answers]);

  const percent = total ? Math.round((score / total) * 100) : 0;
  const progress = total ? Math.round(((showResult ? total : idx) / total) * 100) : 0;

  const reset = () => {
    setIdx(0);
    setSelected(null);
    setAnswers([]);
    setShowResult(false);
  };

  const choose = (optIndex) => {
    if (selected != null) return;
    setSelected(optIndex);

    const correct = optIndex === current.correct;
    setAnswers((prev) => [...prev, { selected: optIndex, correct }]);
  };

  const next = () => {
    if (idx + 1 >= total) {
      setShowResult(true);
      return;
    }
    setIdx((v) => v + 1);
    setSelected(null);
  };

  if (!total) {
    return <p className="text-sm text-gray-600">No quiz questions available.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-gray-900">Quiz</p>
        <p className="text-xs text-gray-500">
          Question {showResult ? total : idx + 1} / {total}
        </p>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: PRIMARY_BLUE }} />
      </div>

      {showResult ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <p className="text-xl font-extrabold text-gray-900">Your score</p>
          <p className="mt-2 text-3xl font-extrabold" style={{ color: PRIMARY_BLUE }}>
            {score} / {total} ({percent}%)
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:shadow-md"
            style={{ backgroundColor: PRIMARY_BLUE }}
          >
            Retake Quiz
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4 animate-fade-in">
          <p className="text-base font-extrabold text-gray-900">{current.question}</p>
          <div className="grid gap-3">
            {current.options.map((opt, optIndex) => {
              const isCorrect = selected != null && optIndex === current.correct;
              const isWrongPick = selected != null && optIndex === selected && selected !== current.correct;

              return (
                <button
                  key={`${opt}-${optIndex}`}
                  type="button"
                  onClick={() => choose(optIndex)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected == null
                      ? 'border-gray-200 bg-white hover:bg-gray-50'
                      : isCorrect
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : isWrongPick
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {selected == null ? 'Pick an answer to continue.' : 'Answer locked.'}
            </p>
            <button
              type="button"
              onClick={next}
              disabled={selected == null}
              className={`rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition ${
                selected == null ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
              }`}
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              {idx + 1 >= total ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleQuiz;

