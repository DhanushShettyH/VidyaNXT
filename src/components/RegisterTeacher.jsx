import React, { useEffect, useState } from 'react';
import { auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';

export default function RegisterTeacher() {
  const [form, setForm] = useState({
    displayName: '',
    grades: '',
    location: '',
    experienceYears: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Failed to sign in anonymously:', error);
          setStatus({ type: 'error', message: 'Authentication failed' });
        }
      } else {
        console.log('Authenticated uid:', user.uid);
        setCurrentUser(user);
        setIsAuthReady(true);
        
        // Force token refresh to ensure it's valid
        try {
          const token = await user.getIdToken(true);
          console.log('Token refreshed successfully');
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Double-check authentication
    if (!currentUser) {
      setStatus({ type: 'error', message: 'User not authenticated' });
      setLoading(false);
      return;
    }

    try {
      // Get fresh token before making the call
      const token = await currentUser.getIdToken(true);
      console.log('Using token for function call');
      
      const register = httpsCallable(functions, 'registerTeacher');
      const result = await register({
        displayName: form.displayName,
        grades: form.grades.split(',').map((g) => g.trim()),
        location: form.location,
        experienceYears: Number(form.experienceYears),
      });
      
      console.log('Function result:', result.data);
      setStatus({ type: 'success', message: 'Registration successful!' });
      setForm({ displayName: '', grades: '', location: '', experienceYears: '' });
    } catch (err) {
      console.error('Registration error:', err);
      
      // Better error handling
      let errorMessage = 'Registration failed';
      if (err.code === 'functions/unauthenticated') {
        errorMessage = 'Authentication failed. Please refresh the page.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6"
      >
        <h2 className="text-2xl font-semibold text-gray-800 text-center">
          Teacher Registration
        </h2>

        {/* Show authentication status */}
        <div className="text-sm text-center">
          {isAuthReady ? (
            <span className="text-green-600">✓ Authenticated ({currentUser?.uid?.slice(0, 8)}...)</span>
          ) : (
            <span className="text-yellow-600">⚠ Authenticating...</span>
          )}
        </div>

        {status && (
          <div
            className={`p-3 rounded ${
              status.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={form.displayName}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label htmlFor="grades" className="block text-sm font-medium text-gray-700">
              Grades (comma‑separated)
            </label>
            <input
              id="grades"
              name="grades"
              type="text"
              placeholder="e.g. 1,2,3"
              value={form.grades}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label htmlFor="experienceYears" className="block text-sm font-medium text-gray-700">
              Years of Experience
            </label>
            <input
              id="experienceYears"
              name="experienceYears"
              type="number"
              min="0"
              value={form.experienceYears}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isAuthReady}
          className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            loading || !isAuthReady
              ? 'bg-indigo-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? 'Registering…' : 'Register'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}