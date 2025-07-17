// src/components/ContentGenerator.jsx
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { ArrowRight, BookOpen, Sparkles, Clock, Download } from 'lucide-react';

const ContentGenerator = () => {
	const [formData, setFormData] = useState({
		prompt: '',
		subject: '',
		grades: [],
		language: 'english'
	});

	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [history, setHistory] = useState([]);
	const [showHistory, setShowHistory] = useState(false);

	const subjects = [
		'Mathematics', 'Science', 'English', 'Hindi', 'Social Studies',
		'Environmental Studies', 'Art', 'Physical Education'
	];

	const gradeOptions = ['1', '2', '3', '4', '5'];
	const languageOptions = [
		{ value: 'english', label: 'English' },
		{ value: 'hindi', label: 'Hindi' },
		{ value: 'marathi', label: 'Marathi' },
		{ value: 'gujarati', label: 'Gujarati' },
		{ value: 'bengali', label: 'Bengali' }
	];

	useEffect(() => {
		loadHistory();
	}, []);

	const loadHistory = async () => {
		try {
			const teacherData = JSON.parse(sessionStorage.getItem('teacherData'));
			if (!teacherData) return;

			const getHistory = httpsCallable(functions, 'getTeacherContentHistory');
			const response = await getHistory({ teacherId: teacherData.id, limit: 5 });
			setHistory(response.data);
		} catch (error) {
			console.error('Error loading history:', error);
		}
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleGradeChange = (grade) => {
		setFormData(prev => ({
			...prev,
			grades: prev.grades.includes(grade)
				? prev.grades.filter(g => g !== grade)
				: [...prev.grades, grade]
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!formData.prompt.trim() || !formData.subject || formData.grades.length === 0) {
			alert('Please fill in all required fields');
			return;
		}

		setLoading(true);
		setResult(null);

		try {
			const teacherData = JSON.parse(sessionStorage.getItem('teacherData'));
			const generateContent = httpsCallable(functions, 'generateContent');

			const response = await generateContent({
				teacherId: teacherData.id,
				...formData
			});

			setResult(response.data);
			loadHistory(); // Refresh history
		} catch (error) {
			console.error('Error generating content:', error);
			alert('Failed to generate content. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const saveToLibrary = async () => {
		if (!result?.sessionId) return;

		try {
			const teacherData = JSON.parse(sessionStorage.getItem('teacherData'));
			const saveContent = httpsCallable(functions, 'saveToContentLibrary');

			await saveContent({
				sessionId: result.sessionId,
				teacherId: teacherData.id,
				tags: [formData.subject, ...formData.grades]
			});

			alert('Content saved to your library!');
		} catch (error) {
			console.error('Error saving to library:', error);
			alert('Failed to save content.');
		}
	};

	const loadFromHistory = (historyItem) => {
		setFormData({
			prompt: historyItem.prompt,
			subject: historyItem.subject,
			grades: historyItem.grades,
			language: historyItem.language
		});
		setResult(historyItem.result);
		setShowHistory(false);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
			<div className="max-w-6xl mx-auto">

				{/* Header */}
				<div className="bg-white rounded-xl shadow-lg p-6 mb-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-lg">
								<Sparkles className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-gray-800">Content Generator</h1>
								<p className="text-gray-600">Create engaging educational content with AI</p>
							</div>
						</div>
						<button
							onClick={() => setShowHistory(!showHistory)}
							className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							<Clock className="w-4 h-4" />
							<span>History</span>
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

					{/* Input Form */}
					<div className="lg:col-span-1">
						<div className="bg-white rounded-xl shadow-lg p-6">
							<h2 className="text-lg font-semibold text-gray-800 mb-4">Content Details</h2>

							<form onSubmit={handleSubmit} className="space-y-4">
								{/* Prompt Input */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Content Request *
									</label>
									<textarea
										name="prompt"
										value={formData.prompt}
										onChange={handleInputChange}
										placeholder="e.g., Create a story about water cycle for young students"
										className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										rows="4"
										required
									/>
								</div>

								{/* Subject Selection */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Subject *
									</label>
									<select
										name="subject"
										value={formData.subject}
										onChange={handleInputChange}
										className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										required
									>
										<option value="">Select subject</option>
										{subjects.map(subject => (
											<option key={subject} value={subject}>{subject}</option>
										))}
									</select>
								</div>

								{/* Grade Selection */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Grades * (Select multiple)
									</label>
									<div className="grid grid-cols-5 gap-2">
										{gradeOptions.map(grade => (
											<button
												key={grade}
												type="button"
												onClick={() => handleGradeChange(grade)}
												className={`p-2 rounded-lg border-2 transition-colors ${formData.grades.includes(grade)
														? 'bg-blue-500 border-blue-500 text-white'
														: 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
													}`}
											>
												{grade}
											</button>
										))}
									</div>
								</div>

								{/* Language Selection */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Language
									</label>
									<select
										name="language"
										value={formData.language}
										onChange={handleInputChange}
										className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										{languageOptions.map(lang => (
											<option key={lang.value} value={lang.value}>{lang.label}</option>
										))}
									</select>
								</div>

								{/* Submit Button */}
								<button
									type="submit"
									disabled={loading}
									className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
								>
									{loading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											<span>Generating...</span>
										</>
									) : (
										<>
											<span>Generate Content</span>
											<ArrowRight className="w-4 h-4" />
										</>
									)}
								</button>
							</form>
						</div>

						{/* History Panel */}
						{showHistory && (
							<div className="bg-white rounded-xl shadow-lg p-6 mt-6">
								<h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Content</h3>
								<div className="space-y-3">
									{history.map((item, index) => (
										<div
											key={index}
											onClick={() => loadFromHistory(item)}
											className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
										>
											<div className="text-sm font-medium text-gray-800 truncate">
												{item.prompt}
											</div>
											<div className="text-xs text-gray-500 mt-1">
												{item.subject} • Grades {item.grades.join(', ')}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Results Display */}
					<div className="lg:col-span-2">
						{loading && (
							<div className="bg-white rounded-xl shadow-lg p-8 text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
								<p className="text-gray-600">Generating personalized content...</p>
							</div>
						)}

						{result && (
							<div className="space-y-6">
								{/* Content Header */}
								<div className="bg-white rounded-xl shadow-lg p-6">
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<BookOpen className="w-6 h-6 text-blue-500" />
											<div>
												<h2 className="text-xl font-semibold text-gray-800">Generated Content</h2>
												<p className="text-gray-600">Reliability Score: {(result.content.reliabilityScore * 100).toFixed(0)}%</p>
											</div>
										</div>
										<button
											onClick={saveToLibrary}
											className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
										>
											<Download className="w-4 h-4" />
											<span>Save to Library</span>
										</button>
									</div>
								</div>

								{/* Grade-wise Content */}
								{Object.entries(result.content.gradeVersions).map(([grade, version]) => (
									<div key={grade} className="bg-white rounded-xl shadow-lg overflow-hidden">
										<div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
											<h3 className="text-lg font-semibold">Grade {grade} Content</h3>
											<p className="text-blue-100">Validation Score: {(version.validationScore * 100).toFixed(0)}%</p>
										</div>
										<div className="p-6">
											<div className="prose max-w-none">
												<h4 className="text-gray-800 font-medium mb-3">Main Content:</h4>
												<div className="bg-gray-50 p-4 rounded-lg mb-4">
													<pre className="whitespace-pre-wrap text-gray-800 font-sans">
														{version.content}
													</pre>
												</div>

												<h4 className="text-gray-800 font-medium mb-3">Classroom Activities:</h4>
												<div className="bg-blue-50 p-4 rounded-lg">
													<pre className="whitespace-pre-wrap text-gray-800 font-sans">
														{version.activities}
													</pre>
												</div>
											</div>
										</div>
									</div>
								))}

								{/* Visual Aids */}
								<div className="bg-white rounded-xl shadow-lg overflow-hidden">
									<div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4">
										<h3 className="text-lg font-semibold">Visual Aids & Materials</h3>
										<p className="text-green-100">Teaching aids and props</p>
									</div>
									<div className="p-6">
										<div className="bg-green-50 p-4 rounded-lg">
											<pre className="whitespace-pre-wrap text-gray-800 font-sans">
												{result.content.visualAids}
											</pre>
										</div>
									</div>
								</div>
							</div>
						)}

						{!loading && !result && (
							<div className="bg-white rounded-xl shadow-lg p-8 text-center">
								<div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
									<Sparkles className="w-8 h-8 text-white" />
								</div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Create</h3>
								<p className="text-gray-600">Fill in the details and generate engaging educational content for your students.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ContentGenerator;