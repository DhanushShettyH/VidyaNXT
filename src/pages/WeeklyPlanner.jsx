import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const WeeklyPlanner = () => {
	const [formData, setFormData] = useState({
		weekStart: '',
		grades: [],
		syllabus: '',
		mustCoverTopics: ['']
	});
	const [loading, setLoading] = useState(false);
	const [generatedPlan, setGeneratedPlan] = useState(null);
	const [existingPlans, setExistingPlans] = useState([]);
	const [processingStatus, setProcessingStatus] = useState(null);

	const gradeOptions = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];

	useEffect(() => {
		fetchExistingPlans();
	}, []);

	// Poll for processing status if plan is being processed
	useEffect(() => {
		let interval;
		if (processingStatus?.status === 'processing') {
			interval = setInterval(() => {
				checkProcessingStatus(processingStatus.planId);
			}, 3000); // Check every 3 seconds
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [processingStatus]);

	const fetchExistingPlans = async () => {
		try {
			const teacherData = JSON.parse(sessionStorage.getItem('teacherData'));
			const getWeeklyPlans = httpsCallable(functions, 'getTeacherWeeklyPlans');
			const result = await getWeeklyPlans({ teacherId: teacherData.id });

			if (result.data.success) {
				setExistingPlans(result.data.plans);
			}
		} catch (error) {
			console.error('Error fetching plans:', error);
		}
	};

	const checkProcessingStatus = async (planId) => {
		try {
			// Add validation before making the call
			if (!planId || planId.trim() === '') {
				console.error('Invalid planId provided to checkProcessingStatus:', planId);
				return;
			}

			console.log('Checking status for planId:', planId);

			const getStatus = httpsCallable(functions, 'getWeeklyPlanStatus');
			const result = await getStatus({ planId: planId.trim() });

			if (result.data.success) {
				const status = result.data;
				setProcessingStatus(status);

				if (status.status === 'completed') {
					setGeneratedPlan(status.data);
					setProcessingStatus(null);
					fetchExistingPlans(); // Refresh the list
				} else if (status.status === 'failed') {
					setProcessingStatus(null);
					alert('Plan processing failed. Please try again.');
				}
			} else {
				console.error('Status check failed:', result.data.error);
				setProcessingStatus(null);
			}
		} catch (error) {
			console.error('Error checking status:', error);
			setProcessingStatus(null);
		}
	};


	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setProcessingStatus(null);

		try {
			const teacherData = JSON.parse(sessionStorage.getItem('teacherData'));
			const createWeeklyPlan = httpsCallable(functions, 'createWeeklyLessonPlan');

			const result = await createWeeklyPlan({
				teacherId: teacherData.id,
				weekStart: formData.weekStart,
				grades: formData.grades,
				syllabus: formData.syllabus,
				mustCoverTopics: formData.mustCoverTopics.filter(topic => topic.trim())
			});

			console.log('Create plan result:', result.data);

			if (result.data.success) {
				if (result.data.isExisting) {
					setGeneratedPlan(result.data.data);
					setProcessingStatus(null); // Clear processing status for existing plans
				} else {
					// New plan - start monitoring processing
					const planId = result.data.planId;

					if (planId && planId.trim() !== '') {
						setProcessingStatus({
							planId: planId,
							status: 'processing',
							processingProgress: 0
						});
						setGeneratedPlan(result.data.data);
					} else {
						console.error('Invalid planId received:', planId);
						alert('Plan created but unable to track progress. Please refresh the page.');
					}
				}
			} else {
				alert('Failed to create lesson plan: ' + (result.data.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error creating plan:', error);
			alert('Failed to create lesson plan. Please try again.');
		} finally {
			setLoading(false);
		}
	};


	// Rest of your form handling functions remain the same...
	const addTopic = () => {
		setFormData(prev => ({
			...prev,
			mustCoverTopics: [...prev.mustCoverTopics, '']
		}));
	};

	const removeTopic = (index) => {
		setFormData(prev => ({
			...prev,
			mustCoverTopics: prev.mustCoverTopics.filter((_, i) => i !== index)
		}));
	};

	const updateTopic = (index, value) => {
		setFormData(prev => ({
			...prev,
			mustCoverTopics: prev.mustCoverTopics.map((topic, i) =>
				i === index ? value : topic
			)
		}));
	};

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-4xl mx-auto px-4">
				<h1 className="text-3xl font-bold text-gray-900 mb-8">Weekly Lesson Planner</h1>

				{/* Processing Status Banner */}
				{processingStatus?.status === 'processing' && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-lg font-semibold text-blue-800">
								🔄 Creating Your Lesson Plan...
							</h3>
							<span className="text-blue-600 font-medium">
								{processingStatus.processingProgress}%
							</span>
						</div>
						<div className="w-full bg-blue-200 rounded-full h-3 mb-2">
							<div
								className="bg-blue-600 h-3 rounded-full transition-all duration-500"
								style={{ width: `${processingStatus.processingProgress}%` }}
							></div>
						</div>
						<p className="text-blue-700 text-sm">
							We're generating content and worksheets for each day. This usually takes 2-3 minutes.
							You can close this page and come back later.
						</p>
					</div>
				)}

				{/* Form Section - Same as before but with updated button text */}
				<div className="bg-white rounded-lg shadow p-6 mb-8">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Week Start Date
								</label>
								<input
									type="date"
									value={formData.weekStart}
									onChange={(e) => setFormData(prev => ({ ...prev, weekStart: e.target.value }))}
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Syllabus Topic
								</label>
								<input
									type="text"
									value={formData.syllabus}
									onChange={(e) => setFormData(prev => ({ ...prev, syllabus: e.target.value }))}
									placeholder="e.g., Periodic Table, Water Cycle, Fractions"
									className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
									required
								/>
							</div>
						</div>

						{/* Grade Selection */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Grades
							</label>
							<div className="flex flex-wrap gap-2">
								{gradeOptions.map((grade) => (
									<label key={grade} className="inline-flex items-center">
										<input
											type="checkbox"
											checked={formData.grades.includes(grade)}
											onChange={(e) => {
												if (e.target.checked) {
													setFormData(prev => ({ ...prev, grades: [...prev.grades, grade] }));
												} else {
													setFormData(prev => ({
														...prev,
														grades: prev.grades.filter(g => g !== grade)
													}));
												}
											}}
											className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
										/>
										<span className="ml-2 text-sm text-gray-700">{grade}</span>
									</label>
								))}
							</div>
						</div>

						{/* Must Cover Topics */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Must Cover Topics
							</label>
							{formData.mustCoverTopics.map((topic, index) => (
								<div key={index} className="flex gap-2 mb-2">
									<input
										type="text"
										value={topic}
										onChange={(e) => updateTopic(index, e.target.value)}
										placeholder="e.g., History of periodic table"
										className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
									/>
									{formData.mustCoverTopics.length > 1 && (
										<button
											type="button"
											onClick={() => removeTopic(index)}
											className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
										>
											Remove
										</button>
									)}
								</div>
							))}
							<button
								type="button"
								onClick={addTopic}
								className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
							>
								+ Add Topic
							</button>
						</div>

						<button
							type="submit"
							disabled={loading || formData.grades.length === 0 || processingStatus?.status === 'processing'}
							className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Creating Plan Structure...' :
								processingStatus?.status === 'processing' ? 'Processing Content...' :
									'Generate Weekly Plan'}
						</button>
					</form>
				</div>

				{/* Generated Plan Display - Enhanced with status indicators */}
				{generatedPlan && (
					<div className="bg-white rounded-lg shadow p-6 mb-8">
						<div className="flex justify-between items-start mb-4">
							<h2 className="text-2xl font-bold text-gray-900">
								📅 Week of {new Date(generatedPlan.weekStart).toLocaleDateString()}
							</h2>
							{generatedPlan.status && (
								<span className={`px-3 py-1 rounded-full text-sm font-medium ${generatedPlan.status === 'completed' ? 'bg-green-100 text-green-800' :
									generatedPlan.status === 'processing' ? 'bg-blue-100 text-blue-800' :
										'bg-gray-100 text-gray-800'
									}`}>
									{generatedPlan.status === 'completed' ? '✅ Complete' :
										generatedPlan.status === 'processing' ? '🔄 Processing' :
											generatedPlan.status}
								</span>
							)}
						</div>

						<div className="grid md:grid-cols-3 gap-4 mb-6">
							<div className="bg-blue-50 p-4 rounded-lg">
								<h3 className="font-semibold text-blue-800">Total Content</h3>
								<p className="text-2xl font-bold text-blue-600">{generatedPlan.totalContent || 0}</p>
							</div>
							<div className="bg-green-50 p-4 rounded-lg">
								<h3 className="font-semibold text-green-800">Worksheets</h3>
								<p className="text-2xl font-bold text-green-600">{generatedPlan.totalWorksheets || 0}</p>
							</div>
							<div className="bg-purple-50 p-4 rounded-lg">
								<h3 className="font-semibold text-purple-800">Est. Hours</h3>
								<p className="text-2xl font-bold text-purple-600">{generatedPlan.estimatedHours}</p>
							</div>
						</div>

						{/* Daily Plans with Status Indicators */}
						<div className="space-y-4">
							{Object.entries(generatedPlan.dailyPlans || {}).map(([date, dayPlan]) => (
								<div key={date} className="border border-gray-200 rounded-lg p-4">
									<div className="flex justify-between items-start mb-3">
										<div>
											<h3 className="text-lg font-semibold text-gray-900">
												{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
											</h3>
											<p className="text-indigo-600 font-medium">{dayPlan.topic}</p>
										</div>
										<div className="flex flex-col gap-1">
											<span className="text-sm bg-gray-100 px-2 py-1 rounded">
												{dayPlan.estimatedDuration}
											</span>
											{/* Content Status Indicators */}
											<div className="flex gap-1">
												<span className={`text-xs px-2 py-1 rounded ${dayPlan.contentCreationStatus === 'completed' ? 'bg-green-100 text-green-700' :
													dayPlan.contentCreationStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
														dayPlan.contentCreationStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
															'bg-red-100 text-red-700'
													}`}>
													📚 {dayPlan.contentCreationStatus || 'pending'}
												</span>
												<span className={`text-xs px-2 py-1 rounded ${dayPlan.worksheetCreationStatus === 'completed' ? 'bg-green-100 text-green-700' :
													dayPlan.worksheetCreationStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
														dayPlan.worksheetCreationStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
															'bg-red-100 text-red-700'
													}`}>
													📝 {dayPlan.worksheetCreationStatus || 'pending'}
												</span>
											</div>
										</div>
									</div>

									<p className="text-gray-600 mb-3">{dayPlan.description}</p>

									<div className="grid md:grid-cols-2 gap-4">
										<div>
											<h4 className="font-medium text-gray-700 mb-1">Objectives:</h4>
											<ul className="text-sm text-gray-600 space-y-1">
												{dayPlan.objectives?.map((obj, idx) => (
													<li key={idx}>• {obj}</li>
												))}
											</ul>
										</div>
										<div>
											<h4 className="font-medium text-gray-700 mb-1">Activities:</h4>
											<ul className="text-sm text-gray-600 space-y-1">
												{dayPlan.activities?.map((activity, idx) => (
													<li key={idx}>• {activity}</li>
												))}
											</ul>
										</div>
									</div>

									<div className="flex gap-2 mt-4">
										<span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
											{dayPlan.contentIds?.length || 0} Content
										</span>
										<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
											{dayPlan.worksheetIds?.length || 0} Worksheets
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Existing Plans - Same as before */}
				{existingPlans.length > 0 && (
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold text-gray-900 mb-4">Previous Lesson Plans</h2>
						<div className="grid md:grid-cols-2 gap-4">
							{existingPlans.map((plan) => (
								<div key={plan.planId} className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50">
									<div className="flex justify-between items-start mb-2">
										<h3 className="font-semibold text-gray-900">{plan.syllabus}</h3>
										<span className={`text-xs px-2 py-1 rounded ${plan.status === 'completed' ? 'bg-green-100 text-green-700' :
											plan.status === 'processing' ? 'bg-blue-100 text-blue-700' :
												'bg-gray-100 text-gray-700'
											}`}>
											{plan.status}
										</span>
									</div>
									<p className="text-sm text-gray-600">
										Week of {new Date(plan.weekStart).toLocaleDateString()}
									</p>
									<p className="text-sm text-gray-500">
										Grades: {plan.grades.join(', ')} • {plan.totalContent || 0} contents • {plan.totalWorksheets || 0} worksheets
									</p>
									<button
										onClick={() => setGeneratedPlan(plan)}
										className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
									>
										View Plan →
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default WeeklyPlanner;
