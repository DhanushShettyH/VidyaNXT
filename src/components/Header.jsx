import React from "react";

export default function Header({ Heading }) {
  const handleBackNative = () => {
    window.history.back();
  };
  return (
    <>
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-5">
              <button
                onClick={handleBackNative}
                className="p-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-800 via-indigo-700 to-emerald-700 bg-clip-text text-transparent">
                  {Heading}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
