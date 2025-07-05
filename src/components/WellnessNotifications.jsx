import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function WellnessNotifications({ teacherId }) {
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filter, setFilter] = useState('all');

	useEffect(() => {
		if (teacherId) {
			fetchNotifications();
		}
	}, [teacherId]);

	const fetchNotifications = async () => {
		try {
			setLoading(true);
			const getWellnessNotifications = httpsCallable(functions, 'getWellnessNotifications');
			const result = await getWellnessNotifications({ teacher_id: teacherId });
			setNotifications(result.data.notifications || []);
		} catch (error) {
			console.error('Error fetching notifications:', error);
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	const markAsRead = async (notificationId) => {
		try {
			const markNotificationRead = httpsCallable(functions, 'markNotificationAsRead');
			await markNotificationRead({
				teacher_id: teacherId,
				notification_id: notificationId
			});

			// Update local state
			setNotifications(notifications.map(notif =>
				notif.id === notificationId ? { ...notif, read: true } : notif
			));
		} catch (error) {
			console.error('Error marking notification as read:', error);
		}
	};

	const markAllAsRead = async () => {
		try {
			const markAllNotificationsRead = httpsCallable(functions, 'markAllNotificationsAsRead');
			await markAllNotificationsRead({ teacher_id: teacherId });

			// Update local state
			setNotifications(notifications.map(notif => ({ ...notif, read: true })));
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
		}
	};

	const getNotificationIcon = (type) => {
		switch (type) {
			case 'critical_alert':
				return '🚨';
			case 'wellness_improvement':
				return '🌟';
			case 'wellness_decline':
				return '⚠️';
			case 'reminder':
				return '🔔';
			default:
				return '📢';
		}
	};

	const getNotificationColor = (type) => {
		switch (type) {
			case 'critical_alert':
				return 'bg-red-50 border-red-200';
			case 'wellness_improvement':
				return 'bg-green-50 border-green-200';
			case 'wellness_decline':
				return 'bg-yellow-50 border-yellow-200';
			case 'reminder':
				return 'bg-blue-50 border-blue-200';
			default:
				return 'bg-gray-50 border-gray-200';
		}
	};

	const filteredNotifications = notifications.filter(notif => {
		if (filter === 'all') return true;
		if (filter === 'unread') return !notif.read;
		if (filter === 'critical') return notif.type === 'critical_alert';
		return true;
	});

	if (loading) {
		return (
			<div className="space-y-4">
				<div className="animate-pulse">
					<div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-16 bg-gray-200 rounded mb-3"></div>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<div className="text-red-600 mb-4">⚠️ Error loading notifications</div>
				<p className="text-gray-600">{error}</p>
				<button
					onClick={fetchNotifications}
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
				<h2 className="text-2xl font-bold text-gray-900">Wellness Notifications</h2>
				<div className="flex space-x-2">
					<button
						onClick={markAllAsRead}
						className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
						disabled={notifications.every(n => n.read)}
					>
						Mark All Read
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="flex space-x-2">
				{[
					{ key: 'all', label: 'All' },
					{ key: 'unread', label: 'Unread' },
					{ key: 'critical', label: 'Critical' }
				].map((filterOption) => (
					<button
						key={filterOption.key}
						onClick={() => setFilter(filterOption.key)}
						className={`px-4 py-2 rounded-md text-sm font-medium ${filter === filterOption.key
								? 'bg-indigo-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}
					>
						{filterOption.label}
						{filterOption.key === 'unread' && (
							<span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
								{notifications.filter(n => !n.read).length}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Notifications List */}
			<div className="space-y-3">
				{filteredNotifications.length > 0 ? (
					filteredNotifications.map((notification) => (
						<div
							key={notification.id}
							className={`p-4 rounded-lg border-2 ${getNotificationColor(notification.type)} ${!notification.read ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
								}`}
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start space-x-3">
									<div className="text-2xl">
										{getNotificationIcon(notification.type)}
									</div>
									<div className="flex-1">
										<div className="flex items-center space-x-2">
											<h3 className="font-semibold text-gray-900">
												{notification.title}
											</h3>
											{!notification.read && (
												<span className="w-2 h-2 bg-blue-500 rounded-full"></span>
											)}
										</div>
										<p className="text-sm text-gray-600 mt-1">
											{notification.message}
										</p>
										<div className="flex items-center space-x-4 mt-2">
											<span className="text-xs text-gray-500">
												{new Date(notification.created_at).toLocaleString()}
											</span>
											<span className="text-xs text-gray-500 capitalize">
												{notification.type.replace('_', ' ')}
											</span>
										</div>
									</div>
								</div>
								<div className="flex items-center space-x-2">
									{!notification.read && (
										<button
											onClick={() => markAsRead(notification.id)}
											className="text-sm text-blue-600 hover:text-blue-800"
										>
											Mark as Read
										</button>
									)}
								</div>
							</div>
						</div>
					))
				) : (
					<div className="text-center py-8">
						<div className="text-gray-400 text-6xl mb-4">🔕</div>
						<p className="text-gray-500">
							{filter === 'all' ? 'No notifications yet' :
								filter === 'unread' ? 'No unread notifications' :
									'No critical notifications'}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}