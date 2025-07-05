import React, { useState, useEffect } from 'react';

export default function WellnessAlerts({ alerts, onAcknowledge }) {
	const [acknowledging, setAcknowledging] = useState(new Set());

	const handleAcknowledge = async (alertId) => {
		setAcknowledging(prev => new Set(prev).add(alertId));
		try {
			await onAcknowledge(alertId);
		} catch (error) {
			console.error('Error acknowledging alert:', error);
		} finally {
			setAcknowledging(prev => {
				const newSet = new Set(prev);
				newSet.delete(alertId);
				return newSet;
			});
		}
	};

	const getAlertIcon = (urgencyLevel) => {
		switch (urgencyLevel) {
			case 'high':
				return '🔴';
			case 'medium':
				return '🟡';
			case 'low':
				return '🟢';
			default:
				return '⚠️';
		}
	};

	const getAlertColor = (urgencyLevel) => {
		switch (urgencyLevel) {
			case 'high':
				return 'border-red-500 bg-red-50';
			case 'medium':
				return 'border-yellow-500 bg-yellow-50';
			case 'low':
				return 'border-green-500 bg-green-50';
			default:
				return 'border-gray-500 bg-gray-50';
		}
	};

	const getUrgencyText = (urgencyLevel) => {
		switch (urgencyLevel) {
			case 'high':
				return 'High Priority';
			case 'medium':
				return 'Medium Priority';
			case 'low':
				return 'Low Priority';
			default:
				return 'Normal';
		}
	};

	const formatTimeAgo = (timestamp) => {
		if (!timestamp) return 'Recently';

		const now = new Date();
		const alertTime = new Date(timestamp);
		const diffMs = now - alertTime;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 60) {
			return `${diffMins} minutes ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hours ago`;
		} else {
			return `${diffDays} days ago`;
		}
	};

	if (!alerts || alerts.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="text-6xl mb-4">✅</div>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Alerts</h3>
				<p className="text-gray-600">You're all caught up! No wellness alerts require your attention.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-gray-900">Wellness Alerts</h2>
				<div className="text-sm text-gray-600">
					{alerts.length} unacknowledged alert{alerts.length !== 1 ? 's' : ''}
				</div>
			</div>

			{/* Alert Summary */}
			<div className="bg-white p-4 rounded-lg shadow border">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<div className="text-2xl">🚨</div>
						<div>
							<h3 className="font-semibold text-gray-900">Active Wellness Alerts</h3>
							<p className="text-sm text-gray-600">
								Please review and acknowledge the following wellness notifications
							</p>
						</div>
					</div>
					<div className="text-right">
						<div className="text-lg font-bold text-red-600">
							{alerts.filter(alert => alert.urgency_level === 'high').length}
						</div>
						<div className="text-xs text-gray-500">High Priority</div>
					</div>
				</div>
			</div>

			{/* Alerts List */}
			<div className="space-y-4">
				{alerts.map((alert) => (
					<div
						key={alert.id}
						className={`border-l-4 rounded-lg p-6 shadow-sm ${getAlertColor(alert.urgency_level)}`}
					>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								{/* Alert Header */}
								<div className="flex items-center mb-3">
									<span className="text-2xl mr-3">{getAlertIcon(alert.urgency_level)}</span>
									<div>
										<h3 className="text-lg font-semibold text-gray-900">
											Wellness Support Needed
										</h3>
										<div className="flex items-center space-x-3 text-sm text-gray-600">
											<span className="font-medium">
												{getUrgencyText(alert.urgency_level)}
											</span>
											<span>•</span>
											<span>{formatTimeAgo(alert.created_at)}</span>
										</div>
									</div>
								</div>

								{/* Alert Message */}
								<div className="mb-4">
									<p className="text-gray-700 leading-relaxed">
										{alert.message}
									</p>
								</div>

								{/* Wellness Scores */}
								{alert.wellness_scores && (
									<div className="mb-4">
										<h4 className="text-sm font-semibold text-gray-900 mb-2">
											Wellness Indicators:
										</h4>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											{Object.entries(alert.wellness_scores).map(([key, value]) => (
												<div key={key} className="text-center">
													<div className="text-lg font-bold text-gray-900">
														{Math.round(value)}%
													</div>
													<div className="text-xs text-gray-600 capitalize">
														{key.replace('_', ' ')}
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Recommendations */}
								{alert.recommendations && alert.recommendations.length > 0 && (
									<div className="mb-4">
										<h4 className="text-sm font-semibold text-gray-900 mb-2">
											Recommendations:
										</h4>
										<ul className="space-y-1">
											{alert.recommendations.map((rec, index) => (
												<li key={index} className="text-sm text-gray-700 flex items-start">
													<span className="text-blue-500 mr-2">•</span>
													{rec}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>

							{/* Acknowledge Button */}
							<div className="ml-4 flex-shrink-0">
								<button
									onClick={() => handleAcknowledge(alert.id)}
									disabled={acknowledging.has(alert.id)}
									className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${acknowledging.has(alert.id)
											? 'bg-gray-300 text-gray-500 cursor-not-allowed'
											: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
										}`}
								>
									{acknowledging.has(alert.id) ? (
										<div className="flex items-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											Processing...
										</div>
									) : (
										'Acknowledge'
									)}
								</button>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Help Section */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div className="flex items-start">
					<div className="text-blue-500 mr-3">💡</div>
					<div>
						<h3 className="text-sm font-semibold text-blue-900 mb-1">
							About Wellness Alerts
						</h3>
						<p className="text-sm text-blue-700">
							These alerts are generated when our AI detects patterns in your interactions
							that may indicate you could benefit from additional support. Acknowledging
							an alert helps us track your wellness journey and improve our recommendations.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}