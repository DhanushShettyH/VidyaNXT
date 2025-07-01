import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and has teacher data
    const storedTeacherData = sessionStorage.getItem('teacherData');
    const displayName = sessionStorage.getItem('displayName');

    if (!auth.currentUser || !storedTeacherData || !displayName) {
      // Redirect to login if not authenticated or missing data
      navigate('/login');
      return;
    }

    try {
      const parsedTeacherData = JSON.parse(storedTeacherData);
      setTeacherData(parsedTeacherData);
    } catch (error) {
      console.error('Error parsing teacher data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('teacherData');
      sessionStorage.removeItem('displayName');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!teacherData) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VidyaNXT</h1>
              <p className="text-sm text-gray-600">Teacher Dashboard</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back, {teacherData.displayName}! 👋
              </h2>
              <p className="text-gray-600">
                Ready to inspire and educate your students today?
              </p>
            </div>
          </div>

          {/* Teacher Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📚</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Grades Teaching
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teacherData.grades?.join(', ') || 'Not specified'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📍</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Location
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teacherData.location || 'Not specified'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⭐</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Experience
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teacherData.experienceYears} years
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🎯</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Member Since
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teacherData.createdAt ? 
                          new Date(teacherData.createdAt).toLocaleDateString() : 
                          'Recently'
                        }
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mr-3">📝</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Create Lesson</div>
                    <div className="text-sm text-gray-500">Start a new lesson plan</div>
                  </div>
                </button>
                <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mr-3">👥</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Manage Students</div>
                    <div className="text-sm text-gray-500">View and organize students</div>
                  </div>
                </button>
                <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mr-3">📊</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">View Reports</div>
                    <div className="text-sm text-gray-500">Check student progress</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}