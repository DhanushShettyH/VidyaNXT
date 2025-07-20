import React, { useState, useEffect } from 'react';

const NetworkIndicator = () => {
	const [status, setStatus] = useState('good'); // Default to 'good'

	const getNetworkStatus = () => {
		if (!navigator.onLine) {
			return 'bad';
		}

		if ('connection' in navigator) {
			const { effectiveType } = navigator.connection;
			switch (effectiveType) {
				case '4g':
					return 'good';
				case '3g':
				case '2g':
					return 'poor';
				case 'slow-2g':
					return 'bad';
				default:
					return 'good';
			}
		}

		// Fallback if API not supported
		return 'good';
	};

	useEffect(() => {
		const updateStatus = () => {
			setStatus(getNetworkStatus());
		};

		// Initial check
		updateStatus();

		// Listen for changes
		window.addEventListener('online', updateStatus);
		window.addEventListener('offline', updateStatus);
		if ('connection' in navigator) {
			navigator.connection.addEventListener('change', updateStatus);
		}

		// Cleanup
		return () => {
			window.removeEventListener('online', updateStatus);
			window.removeEventListener('offline', updateStatus);
			if ('connection' in navigator) {
				navigator.connection.removeEventListener('change', updateStatus);
			}
		};
	}, []);

	// Determine color class based on status
	const colorClass = {
		good: 'bg-emerald-500', // Green
		poor: 'bg-yellow-500',  // Yellow
		bad: 'bg-red-500'       // Red
	}[status];

	return (
		<div className={`absolute -top-1 -right-1 w-4 h-4 ${colorClass} rounded-full border-2 border-white animate-pulse opacity-75`}></div>
	);
};

export default NetworkIndicator;
