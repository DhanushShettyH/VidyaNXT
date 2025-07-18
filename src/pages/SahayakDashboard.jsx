
// src/pages/SahayakDashboard.jsx - Main dashboard page
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const SahayakDashboard = () => {
  const [request, setRequest] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [teacherData, setTeacherData] = useState(null);

  useEffect(() => {
    const storedTeacherData = JSON.parse(sessionStorage.getItem('teacherData'));
    setTeacherData(storedTeacherData);
    if (storedTeacherData?.matchingCriteria?.grades) {
      setSelectedGrades(storedTeacherData.matchingCriteria.grades);
    }
  }, []);

  const handleCreateContent = async () => {
    if (!request.trim()) {
      setError('Please enter a content request');
      return;
    }

    if (selectedGrades.length === 0) {
      setError('Please select at least one grade');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createSahayakContent = httpsCallable(functions, 'createSahayakContent');
      const result = await createSahayakContent({
        teacherId: teacherData.teacherId,
        contentRequest: request,
        grades: selectedGrades
      });

      if (result.data.success) {
        setContent(result.data.data);
      } else {
        setError('Failed to create content');
      }
    } catch (error) {
      console.error('Error creating content:', error);
      setError('Failed to create content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeToggle = (grade) => {
    setSelectedGrades(prev => 
      prev.includes(grade) 
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🎓 Sahayak AI Assistant
        </h1>
        <p className="text-gray-600 mb-6">
          Create localized, differentiated content for your multi-grade classroom
        </p>

        {/* Content Request Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Request
          </label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Example: Create a story about soil types for farming, or Explain the water cycle with local examples"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
          />
        </div>

        {/* Grade Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Grades
          </label>
          <div className="flex flex-wrap gap-2">
            {['1', '2', '3', '4', '5'].map(grade => (
              <button
                key={grade}
                onClick={() => handleGradeToggle(grade)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedGrades.includes(grade)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Grade {grade}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher Location Info */}
        {teacherData && (
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Location:</strong> {teacherData.matchingCriteria.location}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Content will be localized for your region with cultural context and local language support.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreateContent}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Content...
            </span>
          ) : (
            'Create Localized Content'
          )}
        </button>

        {/* Content Display */}
        {content && (
          <ContentDisplay 
            content={content} 
            reliabilityScore={content.reliabilityScore}
            wasRevised={content.wasRevised}
          />
        )}
      </div>
    </div>
  );
};

// Content Display Component
const ContentDisplay = ({ content, reliabilityScore, wasRevised }) => {
  const [activeTab, setActiveTab] = useState('story');

  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Generated Content</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">Reliability Score:</span>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              reliabilityScore > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {Math.round(reliabilityScore * 100)}%
            </div>
          </div>
          {wasRevised && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Revised
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { id: 'story', label: 'Story', icon: '📚' },
          { id: 'grades', label: 'Grade Versions', icon: '📊' },
          { id: 'visual', label: 'Visual Aids', icon: '🎨' },
          { id: 'tips', label: 'Teaching Tips', icon: '💡' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'story' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Main Story</h3>
          <div className="bg-white p-4 rounded-md border">
            <p className="text-gray-800 leading-relaxed">{content.content.story}</p>
          </div>
          
          {content.content.culturalContext && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Cultural Context</h4>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Local References:</strong> {content.content.culturalContext.localReferences?.join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'grades' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Grade-Specific Versions</h3>
          <div className="space-y-4">
            {Object.entries(content.content.gradeVersions).map(([grade, version]) => (
              <div key={grade} className="bg-white p-4 rounded-md border">
                <h4 className="font-medium text-gray-700 mb-2 capitalize">
                  {grade.replace('grade', 'Grade ')}
                </h4>
                <p className="text-gray-800 mb-3">{version.content}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-600 mb-1">Learning Objectives</h5>
                    <ul className="text-sm text-gray-700 list-disc list-inside">
                      {version.objectives?.map((obj, index) => (
                        <li key={index}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-600 mb-1">Key Vocabulary</h5>
                    <div className="flex flex-wrap gap-2">
                      {version.vocabulary?.map((word, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'visual' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Visual Aids</h3>
          <div className="space-y-4">
            {content.content.visualAids?.aids?.map((aid, index) => (
              <div key={index} className="bg-white p-4 rounded-md border">
                <h4 className="font-medium text-gray-700 mb-2">{aid.title}</h4>
                <p className="text-gray-600 mb-3">{aid.description}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-600 mb-1">Drawing Instructions</h5>
                    <ol className="text-sm text-gray-700 list-decimal list-inside">
                      {aid.drawingInstructions?.map((instruction, i) => (
                        <li key={i}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-600 mb-1">Materials Needed</h5>
                    <ul className="text-sm text-gray-700 list-disc list-inside">
                      {aid.materials?.map((material, i) => (
                        <li key={i}>{material}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tips' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Teaching Tips</h3>
          <div className="bg-white p-4 rounded-md border">
            <ul className="space-y-2">
              {content.content.teachingTips?.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">💡</span>
                  <span className="text-gray-800">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SahayakDashboard;

 
