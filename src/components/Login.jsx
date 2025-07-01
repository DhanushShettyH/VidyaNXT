import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // First, sign in anonymously to get authentication context
      const userCredential = await signInAnonymously(auth);
      console.log('🔥 Authenticated user:', userCredential.user.uid);

      // Call the login function to verify teacher exists
      const functions = getFunctions();
      const loginTeacher = httpsCallable(functions, 'loginTeacher');
      
      const result = await loginTeacher({ displayName: name.trim() });
      
      if (result.data.success) {
        // Store teacher data in sessionStorage for the session
        sessionStorage.setItem('teacherData', JSON.stringify(result.data.teacher));
        sessionStorage.setItem('displayName', name.trim());
        
        console.log('✅ Login successful:', result.data.teacher);
        navigate('/home');
      } else {
        setError(result.data.message || 'Teacher not found');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      if (err.code === 'functions/not-found') {
        setError('Teacher with this name not found. Please check your name or register first.');
      } else if (err.code === 'functions/unauthenticated') {
        setError('Authentication failed. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome Back!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your name to login
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your registered name"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Register here
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}