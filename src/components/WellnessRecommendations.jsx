import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function WellnessRecommendations({ teacherId }) {
	const [recommendations, setRecommendations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filter, setFilter] = useState('all');

	useEffect(() => {
		if (teacherId) {
			fetchRecommendations();
		}
	}, [teacherId]);

	const fetchRecommendations = async () => {
		try {
			setLoading(true);
			const getWellnessRecommendations = httpsCallable(functions, 'getWellnessRecommendations');
			const result = await getWellnessRecommendations({ teacher_id: teacherId });
			setRecommendations(result.data.recommendations || []);
		} catch (error) {
			console.error('Error fetching recommendations:', error);
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	const markAsCompleted = async (recommendationId) => {
		try {
			const markRecommendationCompleted = httpsCallable(functions, 'markRecommendationCompleted');
			await markRecommendationCompleted({
				teacher_id: teacherId,
				recommendation_id: recommendationId
			});

			// Update local state
			setRecommendations(recommendations.map(rec =>
				rec.id === recommendationId ? { ...rec, completed: true, completed_at: new Date().toISOString() } : rec
			));
		} catch (error) {
			console.error('Error marking recommendation as completed:', error);
		}
	};

	const dismissRecommendation = async (recommendationId) => {
		try {
			const dismissRecommendation = httpsCallable(functions, 'dismissRecommendation');
			await dismissRecommendation({
				teacher_id: teacherId,
				recommendation_id: recommendationId
			});

			// Update local state
			setRecommendations(recommendations.map(rec =>
				rec.id === recommendationId ? { ...rec, dismissed: true } : rec
			));
		} catch (error) {
			console.error('Error dismissing recommendation:', error);
		}
	};

	const getPriorityColor = (priority) => {
		switch (priority?.toLowerCase()) {
			case 'high':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'medium':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'low':
				return 'bg-green-100 text-green-800 border-green-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	};

	const getCategoryIcon = (category) => {
		switch (category?.toLowerCase()) {
			case 'stress':
				return '😰';
			case 'sleep':
				return '😴';
			case 'mood':
				return '😊';
			case 'energy':
				return '⚡';
			case 'focus':
				return '🎯';
			case 'social':
				return '👥';
			case 'physical':
				return '💪';
			default:
				return '💡';
		}
	};

	const filteredRecommendations = recommendations.filter(rec => {
		if (filter === 'all') return !rec.dismissed;
		if (filter === 'active') return !rec.completed && !rec.dismissed;
		if (filter === 'completed') return rec.completed;
		if (filter === 'high_priority') return rec.priority === 'high' && !rec.dismissed;
		return true;
	});

	if (loading) {
		return (
			<div className="space-y-4">
				<div className="animate-pulse">
					<div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-32 bg-gray-200 rounded mb-3"></div>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<div className="text-red-600 mb-4">⚠️ Error loading recommendations</div>
				<p className="text-gray-600">{error}</p>
				<button
					onClick={fetchRecommendations}
					className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-gray-900">Wellness Recommendations</h2>
				<button
					onClick={fetchRecommendations}
					className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded"
				>
					Refresh
				</button>
			</div>

			{/* Filters */}
			<div className="flex space-x-2 overflow-x-auto">
				{[
					{ key: 'all', label: 'All' },
					{ key: 'active', label: 'Active' },
					{ key: 'completed', label: 'Completed' },
					{ key: 'high_priority', label: 'High Priority' }
				].map((filterOption) => (
					<button
						key={filterOption.key}
						onClick={() => setFilter(filterOption.key)}
						className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${filter === filterOption.key
								? 'bg-indigo-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}
					>
						{filterOption.label}
						{filterOption.key === 'active' && (
							<span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
								{recommendations.filter(r => !r.completed && !r.dismissed).length}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Recommendations List */}
			<div className="space-y-4">
				{filteredRecommendations.length > 0 ? (
					filteredRecommendations.map((recommendation) => (
						<div
							key={recommendation.id}
							className={`p-6 rounded-lg border-2 ${recommendation.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
								} ${recommendation.priority === 'high' ? 'ring-2 ring-red-200' : ''}`}
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start space-x-4">
									<div className="text-3xl">
										{getCategoryIcon(recommendation.category)}
									</div>
									<div className="flex-1">
										<div className="flex items-center space-x-2 mb-2">
											<h3 className="font-semibold text-gray-900">
												{recommendation.title}
											</h3>
											<span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(recommendation.priority)}`}>
												{recommendation.priority} Priority
											</span>
											{recommendation.category && (
												<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
													{recommendation.category}
												</span>
											)}
										</div>

										<p className="text-gray-600 mb-3">
											{recommendation.description}
										</p>

										{recommendation.action_items && recommendation.action_items.length > 0 && (
											<div className="mb-3">
												<h4 className="font-medium text-gray-800 mb-2">Action Items:</h4>
												<ul className="space-y-1">
													{recommendation.action_items.map((item, index) => (
														<li key={index} className="flex items-start space-x-2">
															<span className="text-blue-600 mt-1">•</span>
															<span className="text-sm text-gray-700">{item}</span>
														</li>
													))}
												</ul>
											</div>
										)}

										<div className="flex items-center space-x-4 text-sm text-gray-500">
											<span>
												Created: {new Date(recommendation.created_at).toLocaleDateString()}
											</span>
											{recommendation.expected_impact && (
												<span>Impact: {recommendation.expected_impact}</span>
											)}
											{recommendation.completed && (
												<span className="text-green-600">
													✓ Completed: {new Date(recommendation.completed_at).toLocaleDateString()}
												</span>
											)}
										</div>
									</div>
								</div>

								{!recommendation.completed && !recommendation.dismissed && (
									<div className="flex items-center space-x-2">
										<button
											onClick={() => markAsCompleted(recommendation.id)}
											className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
										>
											Mark Complete
										</button>
										<button
											onClick={() => dismissRecommendation(recommendation.id)}
											className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded"
										>
											Dismiss
										</button>
									</div>
								)}
							</div>
						</div>
					))
				) : (
					<div className="text-center py-8">
						<div className="text-gray-400 text-6xl mb-4">💡</div>
						<p className="text-gray-500">
							{filter === 'all' ? 'No recommendations available' :
								filter === 'active' ? 'No active recommendations' :
									filter === 'completed' ? 'No completed recommendations' :
										'No high priority recommendations'}
						</p>
						<p className="text-gray-400 text-sm mt-2">
							Keep using the app to generate personalized wellness recommendations!
						</p>
					</div>
				)}
			</div>
		</div>
	);
}