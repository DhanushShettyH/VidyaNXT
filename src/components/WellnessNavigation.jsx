import React from 'react';

export default function WellnessNavigation({ navigate, currentPath }) {

	const navigationItems = [
		{
			path: '/wellness',
			label: 'Dashboard',
			icon: '🏠',
			description: 'Overview of your wellness metrics'
		},
		{
			path: '/wellness/metrics',
			label: 'Metrics',
			icon: '📊',
			description: 'Detailed wellness metrics and charts'
		},
		{
			path: '/wellness/alerts',
			label: 'Alerts',
			icon: '🚨',
			description: 'Critical wellness alerts and warnings'
		},
		{
			path: '/wellness/analytics',
			label: 'Analytics',
			icon: '📈',
			description: 'Advanced wellness analytics and insights'
		},
		{
			path: '/wellness/notifications',
			label: 'Notifications',
			icon: '🔔',
			description: 'Wellness notifications and updates'
		},
		{
			path: '/wellness/recommendations',
			label: 'Recommendations',
			icon: '💡',
			description: 'AI-powered wellness recommendations'
		}
	];

	const isActive = (path) => currentPath === path;

	return (
		<div className="bg-white shadow rounded-lg p-6 mb-6">
			<h2 className="text-lg font-semibold text-gray-900 mb-4">Wellness Tools</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{navigationItems.map((item) => (
					<button
						key={item.path}
						onClick={() => navigate(item.path)}
						className={`p-4 rounded-lg border-2 text-left transition-all ${isActive(item.path)
								? 'border-indigo-500 bg-indigo-50 text-indigo-700'
								: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
							}`}
					>
						<div className="flex items-center space-x-3">
							<div className="text-2xl">{item.icon}</div>
							<div>
								<div className="font-medium">{item.label}</div>
								<div className="text-sm text-gray-600">{item.description}</div>
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}