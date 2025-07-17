// src/components/ContentLibrary.jsx
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Search, BookOpen, Calendar, Tags, Download, Eye } from 'lucide-react';

const ContentLibrary = () => {
	const [savedContent, setSavedContent] = useState([]);
	const [filteredContent, setFilteredContent] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedSubject, setSelectedSubject] = useState('');
	const [selectedGrades, setSelectedGrades] = useState([]);
	const [viewingContent, setViewingContent] = useState(null);

	const subjects = [
		'Mathematics', 'Science', 'English', 'Hindi', 'Social Studies',
		'Environmental Studies', 'Art', 'Physical Education'
	];

	const gradeOptions = ['1', '2', '3', '4', '5'];

	useEffect(() => {
		loadSavedContent();
	}, []);

	useEffect(() => {
		filterContent();
	}, [savedContent, searchTerm, selectedSubject, selectedGrades]);

	const loadSavedContent = async () => {
		try {
			const teacherData = JSON.parse(sessionStorage.getItem('teacherData'));
			if (!teacherData) return;

			const searchLibrary = httpsCallable(functions, 'searchContentLibrary');
			const response = await searchLibrary({
				teacherId: teacherData.id,
				limit: 50
			});

			setSavedContent(response.data);
		} catch (error) {
			console.error('Error loading saved content:', error);
		} finally {
			setLoading(false);
		}
	};

	const filterContent = () => {
		let filtered = savedContent;

		// Search term filter
		if (searchTerm) {
			filtered = filtered.filter(content =>
				content.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
				content.subject.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Subject filter
		if (selectedSubject) {
			filtered = filtered.filter(content => content.subject === selectedSubject);
		}

		// Grade filter
		if (selectedGrades.length > 0) {
			filtered = filtered.filter(content =>
				selectedGrades.some(grade => content.grades.includes(grade))
			);
		}

		setFilteredContent(filtered);
	};

	const handleGradeFilter = (grade) => {
		setSelectedGrades(prev =>
			prev.includes(grade)
				? prev.filter(g => g !== grade)
				: [...prev, grade]
		);
	};

	const formatDate = (timestamp) => {
		if (!timestamp) return 'Unknown';

		const date = timestamp._seconds
			? new Date(timestamp._seconds * 1000)
			: new Date(timestamp);

		return date.toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	};

	const ContentCard = ({ content }) => (
		<div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
			<div className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
							{content.prompt}
						</h3>
						<div className="flex items-center space-x-4 text-sm text-gray-600">
							<div className="flex items-center space-x-1">
								<BookOpen className="w-4 h-4" />
								<span>{content.subject}</span>
							</div>
							<div className="flex items-center space-x-1">
								<Calendar className="w-4 h-4" />
								<span>{formatDate(content.savedAt)}</span>
							</div>
						</div>
					</div>
					<div className="flex items-center space-x-1">
						{content.result?.content?.reliabilityScore && (
							<div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
								{(content.result.content.reliabilityScore * 100).toFixed(0)}%
							</div>
						)}
					</div>
				</div>

				{/* Grade tags */}
				<div className="flex items-center space-x-2 mb-4">
					<Tags className="w-4 h-4 text-gray-500" />
					<div className="flex flex-wrap gap-1">
						{content.grades.map(grade => (
							<span
								key={grade}
								className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
							>
								Grade {grade}
							</span>
						))}
					</div>
				</div>

				{/* Language */}
				<div className="flex items-center justify-between">
					<span className="text-sm text-gray-600 capitalize">
						Language: {content.language}
					</span>
					<button
						onClick={() => setViewingContent(content)}
						className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						<Eye className="w-4 h-4" />
						<span>View</span>
					</button>
				</div>
			</div>
		</div>
	);

	const ContentViewer = ({ content, onClose }) => (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-gray-200 flex items-center justify-between">
					<h2 className="text-xl font-semibold text-gray-800">
						{content.prompt}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl"
					>
						×
					</button>
				</div>

				<div className="p-6 space-y-6">
					{/* Content metadata */}
					<div className="bg-gray-50 p-4 rounded-lg">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<span className="font-medium text-gray-700">Subject:</span>
								<p className="text-gray-600">{content.subject}</p>
							</div>
							<div>
								<span className="font-medium text-gray-700">Grades:</span>
								<p className="text-gray-600">{content.grades.join(', ')}</p>
							</div>
							<div>
								<span className="font-medium text-gray-700">Language:</span>
								<p className="text-gray-600 capitalize">{content.language}</p>
							</div>
							<div>
								<span className="font-medium text-gray-700">Created:</span>
								<p className="text-gray-600">{formatDate(content.savedAt)}</p>
							</div>
						</div>
					</div>

					{/* Grade-wise content */}
					{content.result?.content?.gradeVersions &&
						Object.entries(content.result.content.gradeVersions).map(([grade, version]) => (
							<div key={grade} className="border border-gray-200 rounded-lg overflow-hidden">
								<div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
									<h3 className="text-lg font-semibold">Grade {grade} Content</h3>
								</div>
								<div className="p-4">
									<div className="mb-4">
										<h4 className="font-medium text-gray-800 mb-2">Main Content:</h4>
										<div className="bg-gray-50 p-3 rounded-lg">
											<pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm">
												{version.content}
											</pre>
										</div>
									</div>

									<div>
										<h4 className="font-medium text-gray-800 mb-2">Activities:</h4>
										<div className="bg-blue-50 p-3 rounded-lg">
											<pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm">
												{version.activities}
											</pre>
										</div>
									</div>
								</div>
							</div>
						))}

					{/* Visual aids */}
					{content.result?.content?.visualAids && (
						<div className="border border-gray-200 rounded-lg overflow-hidden">
							<div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4">
								<h3 className="text-lg font-semibold">Visual Aids & Materials</h3>
							</div>
							<div className="p-4">
								<div className="bg-green-50 p-3 rounded-lg">
									<pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm">
										{content.result.content.visualAids}
									</pre>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
			<div className="max-w-6xl mx-auto">

				{/* Header */}
				<div className="bg-white rounded-xl shadow-lg p-6 mb-6">
					<div className="flex items-center space-x-3">
						<div className="bg-gradient-to-r from-green-500 to-blue-500 p-3 rounded-lg">
							<BookOpen className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-gray-800">Content Library</h1>
							<p className="text-gray-600">Access your saved educational content</p>
						</div>
					</div>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-xl shadow-lg p-6 mb-6">
					<div className="grid grid-cols-1 md:grid-cols-12 gap-4">

						{/* Search */}
						<div className="md:col-span-4">
							<div className="relative">
								<Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Search content..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						</div>

						{/* Subject Filter */}
						<div className="md:col-span-3">
							<select
								value={selectedSubject}
								onChange={(e) => setSelectedSubject(e.target.value)}
								className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								<option value="">All Subjects</option>
								{subjects.map(subject => (
									<option key={subject} value={subject}>{subject}</option>
								))}
							</select>
						</div>

						{/* Grade Filter */}
						<div className="md:col-span-5">
							<div className="flex items-center space-x-2">
								<span className="text-sm text-gray-600 whitespace-nowrap">Grades:</span>
								<div className="flex flex-wrap gap-1">
									{gradeOptions.map(grade => (
										<button
											key={grade}
											onClick={() => handleGradeFilter(grade)}
											className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedGrades.includes(grade)
													? 'bg-blue-500 text-white'
													: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
												}`}
										>
											{grade}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Content Grid */}
				{loading ? (
					<div className="bg-white rounded-xl shadow-lg p-8 text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
						<p className="text-gray-600">Loading your content library...</p>
					</div>
				) : filteredContent.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredContent.map((content, index) => (
							<ContentCard key={index} content={content} />
						))}
					</div>
				) : (
					<div className="bg-white rounded-xl shadow-lg p-8 text-center">
						<BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-gray-800 mb-2">
							{savedContent.length === 0 ? 'No Saved Content' : 'No Matches Found'}
						</h3>
						<p className="text-gray-600">
							{savedContent.length === 0
								? 'Start generating content to build your library.'
								: 'Try adjusting your filters to find content.'}
						</p>
					</div>
				)}

				{/* Content Viewer Modal */}
				{viewingContent && (
					<ContentViewer
						content={viewingContent}
						onClose={() => setViewingContent(null)}
					/>
				)}
			</div>
		</div>
	);
};

export default ContentLibrary;