
// src/pages/SahayakDashboard.jsx - Main dashboard page
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const SahayakDashboard = () => {
	const [formData, setFormData] = useState({
		prompt: '',
		language: 'marathi',
		region: 'maharashtra',
		grades: [1, 2, 3],
		subject: 'science'
	});

	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState(null);
	const [error, setError] = useState(null);

	const generateContent = httpsCallable(functions, 'generateSahayakContent');

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const result = await generateContent(formData);
			setResults(result.data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
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

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6 text-center">
				🎓 Sahayak AI Workshop
			</h1>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Input Form */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold mb-4">Create Teaching Content</h2>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium mb-2">
								Content Request
							</label>
							<textarea
								name="prompt"
								value={formData.prompt}
								onChange={handleInputChange}
								placeholder="e.g., Create a story about soil types for farmers..."
								className="w-full p-3 border border-gray-300 rounded-md h-24"
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-2">
									Language
								</label>
								<select
									name="language"
									value={formData.language}
									onChange={handleInputChange}
									className="w-full p-3 border border-gray-300 rounded-md"
								>
									<option value="marathi">Marathi</option>
									<option value="hindi">Hindi</option>
									<option value="english">English</option>
									<option value="gujarati">Gujarati</option>
									<option value="tamil">Tamil</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									Region
								</label>
								<select
									name="region"
									value={formData.region}
									onChange={handleInputChange}
									className="w-full p-3 border border-gray-300 rounded-md"
								>
									<option value="maharashtra">Maharashtra</option>
									<option value="gujarat">Gujarat</option>
									<option value="karnataka">Karnataka</option>
									<option value="tamil_nadu">Tamil Nadu</option>
								</select>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">
								Target Grades
							</label>
							<div className="grid grid-cols-4 gap-2">
								{[1, 2, 3, 4, 5, 6, 7, 8].map(grade => (
									<button
										key={grade}
										type="button"
										onClick={() => handleGradeChange(grade)}
										className={`p-2 rounded-md text-sm font-medium ${formData.grades.includes(grade)
												? 'bg-blue-500 text-white'
												: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
											}`}
									>
										Grade {grade}
									</button>
								))}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">
								Subject
							</label>
							<select
								name="subject"
								value={formData.subject}
								onChange={handleInputChange}
								className="w-full p-3 border border-gray-300 rounded-md"
							>
								<option value="science">Science</option>
								<option value="mathematics">Mathematics</option>
								<option value="language">Language</option>
								<option value="social_studies">Social Studies</option>
							</select>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
						>
							{loading ? 'Generating Content...' : 'Create Content'}
						</button>
					</form>

					{error && (
						<div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
							{error}
						</div>
					)}
				</div>

				{/* Results Panel */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold mb-4">Generated Content</h2>

					{results ? (
						<div className="space-y-4">
							{/* Reliability Score */}
							<div className="bg-green-50 p-3 rounded-md">
								<h3 className="font-semibold text-green-800">
									Reliability Score: {(results.simulation.reliabilityScore * 100).toFixed(1)}%
								</h3>
								<p className="text-sm text-green-600">
									Content validated through virtual classroom simulation
								</p>
							</div>

							{/* Localized Story */}
							{results.content.localized && (
								<div>
									<h3 className="font-semibold mb-2">📚 Localized Story</h3>
									<div className="bg-blue-50 p-3 rounded-md">
										<p className="text-sm">
											{results.content.localized.localizedContent}
										</p>
									</div>
								</div>
							)}

							{/* Grade-wise Worksheets */}
							{results.content.differentiated && (
								<div>
									<h3 className="font-semibold mb-2">📝 Grade-wise Worksheets</h3>
									<div className="space-y-2">
										{results.content.differentiated.gradeLevels.map((level, idx) => (
											<div key={idx} className="bg-yellow-50 p-2 rounded">
												<h4 className="font-medium">Grade {level.grade}</h4>
												<p className="text-sm">{level.content}</p>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Visual Aids */}
							{results.content.visual && (
								<div>
									<h3 className="font-semibold mb-2">🎨 Visual Aids</h3>
									<div className="bg-purple-50 p-3 rounded-md">
										<div
											dangerouslySetInnerHTML={{
												__html: results.content.visual.svgCode
											}}
											className="mb-2"
										/>
										<p className="text-sm">
											{results.content.visual.description}
										</p>
									</div>
								</div>
							)}

							{/* Simulation Results */}
							<div>
								<h3 className="font-semibold mb-2">🔬 Simulation Insights</h3>
								<div className="bg-gray-50 p-3 rounded-md text-sm">
									{results.simulation.recommendations.map((rec, idx) => (
										<div key={idx} className="mb-1">• {rec}</div>
									))}
								</div>
							</div>
						</div>
					) : (
						<div className="text-center text-gray-500 py-8">
							<p>Generated content will appear here...</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SahayakDashboard;

