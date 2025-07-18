// src/components/SahayakContent.jsx - React component for Sahayak
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const SahayakContent = () => {
	const [formData, setFormData] = useState({
		topic: '',
		subject: 'science',
		grades: ['1'],
		language: 'marathi',
		location: 'maharashtra'
	});
	const [loading, setLoading] = useState(false);
	const [content, setContent] = useState(null);
	const [error, setError] = useState(null);
	const [sessions, setSessions] = useState([]);

	const createSahayakContent = httpsCallable(functions, 'createSahayakContent');
	const getSahayakSession = httpsCallable(functions, 'getSahayakSession');

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const result = await createSahayakContent(formData);
			setContent(result.data);

			// Add to sessions list
			setSessions(prev => [...prev, {
				id: result.data.sessionId,
				topic: formData.topic,
				subject: formData.subject,
				grades: formData.grades,
				createdAt: new Date(),
				reliabilityScore: result.data.reliabilityScore
			}]);

		} catch (error) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleGradeChange = (grade) => {
		setFormData(prev => ({
			...prev,
			grades: prev.grades.includes(grade)
				? prev.grades.filter(g => g !== grade)
				: [...prev.grades, grade]
		}));
	};

	const loadSession = async (sessionId) => {
		try {
			const result = await getSahayakSession({ sessionId });
			setContent(result.data.session);
		} catch (error) {
			setError(error.message);
		}
	};

	return (
		<div className="max-w-6xl mx-auto p-6">
			<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
				<h2 className="text-2xl font-bold mb-6 text-gray-800">
					Sahayak Content Generator
				</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Topic
						</label>
						<input
							type="text"
							value={formData.topic}
							onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Enter topic (e.g., soil, water, plants)"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Subject
						</label>
						<select
							value={formData.subject}
							onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="science">Science</option>
							<option value="mathematics">Mathematics</option>
							<option value="language">Language</option>
							<option value="social_studies">Social Studies</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Grades
						</label>
						<div className="flex space-x-4">
							{['1', '2', '3'].map(grade => (
								<label key={grade} className="flex items-center">
									<input
										type="checkbox"
										checked={formData.grades.includes(grade)}
										onChange={() => handleGradeChange(grade)}
										className="mr-2"
									/>
									Grade {grade}
								</label>
							))}
						</div>
					</div>

					<div className="flex space-x-4">
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Language
							</label>
							<select
								value={formData.language}
								onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="marathi">Marathi</option>
								<option value="hindi">Hindi</option>
								<option value="english">English</option>
							</select>
						</div>

						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Location
							</label>
							<select
								value={formData.location}
								onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="maharashtra">Maharashtra</option>
								<option value="karnataka">Karnataka</option>
								<option value="gujarat">Gujarat</option>
							</select>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Generating Content...' : 'Generate Content'}
					</button>
				</form>

				{error && (
					<div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
						{error}
					</div>
				)}
			</div>

			{/* Previous Sessions */}
			{sessions.length > 0 && (
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<h3 className="text-lg font-semibold mb-4">Previous Sessions</h3>
					<div className="space-y-2">
						{sessions.map(session => (
							<div
								key={session.id}
								className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
								onClick={() => loadSession(session.id)}
							>
								<div>
									<span className="font-medium">{session.topic}</span>
									<span className="text-gray-500 ml-2">
										{session.subject} • Grades {session.grades.join(', ')}
									</span>
								</div>
								<div className="text-sm text-gray-500">
									Score: {(session.reliabilityScore * 100).toFixed(1)}%
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Generated Content Display */}
			{content && (
				<div className="bg-white rounded-lg shadow-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold">Generated Content</h3>
						<div className="flex items-center space-x-2">
							<span className="text-sm text-gray-500">Reliability Score:</span>
							<span className={`px-2 py-1 rounded text-sm ${content.reliabilityScore >= 0.8 ? 'bg-green-100 text-green-800' :
									content.reliabilityScore >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
										'bg-red-100 text-red-800'
								}`}>
								{(content.reliabilityScore * 100).toFixed(1)}%
							</span>
						</div>
					</div>

					{content.content && (
						<div className="space-y-6">
							{/* Story Content */}
							<div>
								<h4 className="font-medium mb-3">Story: {content.content.story?.title}</h4>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{Object.entries(content.content.story?.versions || {}).map(([grade, version]) => (
										<div key={grade} className="border rounded-lg p-4">
											<h5 className="font-medium mb-2">Grade {grade}</h5>
											<p className="text-sm text-gray-600">{version.story}</p>
										</div>
									))}
								</div>
							</div>

							{/* Visual Aids */}
							{content.content.visualAids && (
								<div>
									<h4 className="font-medium mb-3">Visual Aids</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{Object.entries(content.content.visualAids.diagrams || {}).map(([key, svg]) => (
											<div key={key} className="border rounded-lg p-4">
												<h5 className="font-medium mb-2">{key}</h5>
												<div dangerouslySetInnerHTML={{ __html: svg }} />
											</div>
										))}
									</div>
								</div>
							)}

							{/* Activities */}
							{content.content.activities && (
								<div>
									<h4 className="font-medium mb-3">Activities</h4>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										{Object.entries(content.content.activities).map(([grade, activities]) => (
											<div key={grade} className="border rounded-lg p-4">
												<h5 className="font-medium mb-2">Grade {grade}</h5>
												<ul className="text-sm space-y-1">
													{activities.map((activity, index) => (
														<li key={index} className="flex items-start">
															<span className="text-blue-500 mr-2">•</span>
															{activity}
														</li>
													))}
												</ul>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Validation Report */}
							{content.validationReport && (
								<div>
									<h4 className="font-medium mb-3">Validation Report</h4>
									<div className="bg-gray-50 rounded-lg p-4">
										{Object.entries(content.validationReport).map(([grade, report]) => (
											<div key={grade} className="mb-4">
												<h5 className="font-medium">Grade {grade}</h5>
												<p className="text-sm text-gray-600">
													Average Score: {(report.averageScore * 100).toFixed(1)}%
												</p>
												<p className="text-sm text-gray-600">
													Engagement: {(report.averageEngagement * 100).toFixed(1)}%
												</p>
												{report.overallIssues.length > 0 && (
													<div className="mt-2">
														<p className="text-sm font-medium text-red-600">Issues:</p>
														<ul className="text-sm text-red-600 ml-4">
															{report.overallIssues.map((issue, index) => (
																<li key={index}>• {issue}</li>
															))}
														</ul>
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SahayakContent;