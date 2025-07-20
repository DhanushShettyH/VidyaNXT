import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export default function Home() {
	const [teacherData, setTeacherData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [unreadTotal, setUnreadTotal] = useState(0);
	const [wellnessAlerts, setWellnessAlerts] = useState(0);

	const navigate = useNavigate();
	const cardRefs = useRef([]);
	const headerRef = useRef(null);
	const heroRef = useRef(null);
	const academicSectionRef = useRef(null);
	const personalSectionRef = useRef(null);
	const loadingRef = useRef(null);

	useEffect(() => {
		const storedTeacherData = sessionStorage.getItem("teacherData");
		const displayName = sessionStorage.getItem("displayName");

		if (!auth.currentUser || !storedTeacherData || !displayName) {
			navigate("/login");
			return;
		}

		try {
			const parsedTeacherData = JSON.parse(storedTeacherData);
			setTeacherData(parsedTeacherData);
		} catch (error) {
			console.error("Error parsing teacher data:", error);
			navigate("/login");
		} finally {
			setLoading(false);
		}
	}, [navigate]);

	// GSAP Loading Animation
	useEffect(() => {
		if (loading && loadingRef.current) {
			const tl = gsap.timeline({ repeat: -1 });
			tl.to(loadingRef.current.querySelector('.spinner-outer'), {
				rotation: 360,
				duration: 1.5,
				ease: "power2.inOut"
			})
				.to(loadingRef.current.querySelector('.spinner-inner'), {
					rotation: -360,
					duration: 1,
					ease: "power2.inOut"
				}, 0);
		}
	}, [loading]);

	// GSAP Page Entry Animation
	useEffect(() => {
		if (!loading && teacherData) {
			const tl = gsap.timeline();

			// Header animation
			tl.fromTo(headerRef.current,
				{ y: -100, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
			)
				// Hero section animation
				.fromTo(heroRef.current,
					{ y: 50, opacity: 0, scale: 0.95 },
					{ y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" },
					"-=0.4"
				)
				// Academic section title
				.fromTo(academicSectionRef.current.querySelector('h3'),
					{ x: -30, opacity: 0 },
					{ x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
					"-=0.2"
				)
				// Personal section title
				.fromTo(personalSectionRef.current.querySelector('h3'),
					{ x: -30, opacity: 0 },
					{ x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
					"-=0.4"
				);

			// Animate cards with stagger
			gsap.fromTo(cardRefs.current.filter(ref => ref),
				{
					y: 40,
					opacity: 0,
					scale: 0.9,
					rotateY: -15
				},
				{
					y: 0,
					opacity: 1,
					scale: 1,
					rotateY: 0,
					duration: 0.6,
					ease: "power2.out",
					stagger: 0.1,
					delay: 0.3
				}
			);
		}
	}, [loading, teacherData]);

	// GSAP Scroll-triggered animations
	useEffect(() => {
		if (!loading && teacherData) {
			cardRefs.current.forEach((card, index) => {
				if (card) {
					// Hover animations
					const icon = card.querySelector('.card-icon');
					const overlay = card.querySelector('.card-overlay');
					const arrow = card.querySelector('.card-arrow');

					card.addEventListener('mouseenter', () => {
						gsap.to(card, {
							y: -8,
							scale: 1.02,
							boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)",
							duration: 0.3,
							ease: "power2.out"
						});
						gsap.to(icon, {
							scale: 1.1,
							rotate: 3,
							duration: 0.3,
							ease: "power2.out"
						});
						gsap.to(overlay, {
							opacity: 0.3,
							duration: 0.3,
							ease: "power2.out"
						});
						gsap.to(arrow, {
							x: 4,
							duration: 0.3,
							ease: "power2.out"
						});
					});

					card.addEventListener('mouseleave', () => {
						gsap.to(card, {
							y: 0,
							scale: 1,
							boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
							duration: 0.3,
							ease: "power2.out"
						});
						gsap.to(icon, {
							scale: 1,
							rotate: 0,
							duration: 0.3,
							ease: "power2.out"
						});
						gsap.to(overlay, {
							opacity: 0,
							duration: 0.3,
							ease: "power2.out"
						});
						gsap.to(arrow, {
							x: 0,
							duration: 0.3,
							ease: "power2.out"
						});
					});

					// Click animation
					card.addEventListener('mousedown', () => {
						gsap.to(card, {
							scale: 0.98,
							duration: 0.1,
							ease: "power2.out"
						});
					});

					card.addEventListener('mouseup', () => {
						gsap.to(card, {
							scale: 1.02,
							duration: 0.1,
							ease: "power2.out"
						});
					});
				}
			});

			// Cleanup function
			return () => {
				ScrollTrigger.getAll().forEach(trigger => trigger.kill());
			};
		}
	}, [loading, teacherData]);

	useEffect(() => {
		if (!teacherData) return;

		const q = query(
			collection(db, "conversations"),
			where("members", "array-contains", teacherData.id)
		);

		const unsub = onSnapshot(q, (snap) => {
			let total = 0;
			snap.forEach((doc) => {
				const data = doc.data();
				const count = data.unreadCounts?.[teacherData.id] || 0;
				total += count;
			});
			setUnreadTotal(total);
		});

		return () => unsub();
	}, [teacherData]);

	useEffect(() => {
		if (!teacherData) return;

		const alertsQuery = query(
			collection(db, "teachers", teacherData.id, "wellness_alerts"),
			where("acknowledged", "==", false)
		);

		const unsub = onSnapshot(alertsQuery, (snap) => {
			setWellnessAlerts(snap.size);
		});

		return () => unsub();
	}, [teacherData]);

	const handleLogout = async () => {
		try {
			await signOut(auth);
			sessionStorage.removeItem("teacherData");
			sessionStorage.removeItem("displayName");
			navigate("/login");
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	if (loading) {
		return (
			<div ref={loadingRef} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
				<div className="text-center">
					<div className="relative">
						<div className="spinner-outer animate-spin rounded-full h-20 w-20 border-4 border-indigo-100"></div>
						<div className="spinner-inner animate-spin rounded-full h-20 w-20 border-4 border-indigo-600 border-t-transparent absolute top-0"></div>
					</div>
					<p className="mt-6 text-slate-700 font-semibold text-lg">Initializing your AI teaching hub...</p>
				</div>
			</div>
		);
	}

	if (!teacherData) {
		return null;
	}

	const academicActions = [
		{
			to: "/content-hub",
			icon: "🎓",
			title: "AI Content Studio",
			description: "Generate hyper-local, multi-grade educational content instantly",
			primaryColor: "indigo",
			stats: "Generate in seconds"
		},
		{
			to: "/content-library",
			icon: "📚",
			title: "Knowledge Vault",
			description: "Your curated collection of AI-generated teaching resources",
			primaryColor: "emerald",
			stats: "Always accessible"
		},
		{
			to: "/peer-advice",
			icon: "🤝",
			title: "Teacher Network",
			description: "Connect with India's distributed teaching intelligence community",
			primaryColor: "indigo",
			stats: "50,000+ teachers"
		}
	];

	const personalActions = [
		{
			to: "/peers",
			icon: "💬",
			title: "Community Chat",
			description: "Real-time conversations with your teaching peers",
			primaryColor: "emerald",
			badge: unreadTotal,
			stats: unreadTotal > 0 ? `${unreadTotal} unread` : "Stay connected"
		},
		{
			to: "/wellness-dashboard",
			icon: "🧘",
			title: "Wellness Intelligence",
			description: "AI-powered insights for sustainable teaching practices",
			primaryColor: "indigo",
			badge: wellnessAlerts,
			stats: wellnessAlerts > 0 ? `${wellnessAlerts} alerts` : "Monitor health"
		}
	];

	const getColorClasses = (color, variant = 'default') => {
		const colorMap = {
			indigo: {
				default: 'from-indigo-600 to-indigo-800',
				light: 'from-indigo-50 to-indigo-100',
				text: 'text-indigo-700',
				bg: 'bg-indigo-600',
				hover: 'hover:bg-indigo-700',
				border: 'border-indigo-200'
			},
			emerald: {
				default: 'from-emerald-600 to-emerald-800',
				light: 'from-emerald-50 to-emerald-100',
				text: 'text-emerald-700',
				bg: 'bg-emerald-600',
				hover: 'hover:bg-emerald-700',
				border: 'border-emerald-200'
			}
		};
		return colorMap[color]?.[variant] || colorMap.indigo[variant];
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
			{/* Header */}
			<header
				ref={headerRef}
				className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 shadow-sm"
			>
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div className="flex items-center space-x-4">
							<div className="relative">
								<div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
									<span className="text-white font-bold text-xl">V</span>
								</div>
								<div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
							</div>
							<div>
								<h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-800 via-indigo-700 to-emerald-700 bg-clip-text text-transparent">
									VidyaNXT
								</h1>
								<p className="text-sm text-slate-600 font-medium tracking-wide">AI Teaching Intelligence Platform</p>
							</div>
						</div>
						<div className="flex items-center space-x-4">
							<div className="hidden md:flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-emerald-50 px-4 py-2 rounded-xl">
								<div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
								<span className="text-sm font-medium text-slate-700">AI Active</span>
							</div>
							<button
								onClick={handleLogout}
								className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105"
							>
								Sign Out
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
				{/* Welcome Hero Section */}
				<div className="mb-16">
					<div
						ref={heroRef}
						className="relative bg-gradient-to-r from-indigo-900 via-indigo-800 to-emerald-800 rounded-3xl p-10 overflow-hidden shadow-2xl"
					>
						<div className="absolute inset-0 opacity-10">
							<div className="absolute inset-0 bg-gray-100 bg-repeat"></div>
						</div>

						<div className="relative z-10 flex items-center justify-between">
							<div className="flex-1">
								<div className="flex items-center mb-4">
									<div>
										<h2 className="text-4xl font-bold text-white mb-2">
											Welcome back, {teacherData.displayName}
										</h2>
										<p className="text-indigo-200 text-xl leading-relaxed max-w-3xl">
											Your distributed AI teaching intelligence network is ready to transform multi-grade education across India.
										</p>
									</div>
								</div>

								<div className="flex flex-wrap gap-4 mt-8">
									<div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
										<span className="text-indigo-200 text-sm font-medium">🤖 Multi-Agent AI Active</span>
									</div>
									<div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
										<span className="text-emerald-200 text-sm font-medium">🌐 Peer Network Connected</span>
									</div>
									<div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
										<span className="text-indigo-200 text-sm font-medium">📱 Offline-First Ready</span>
									</div>
								</div>
							</div>

							<div className="hidden lg:block">
								<div className="w-32 h-32 bg-gradient-to-r from-emerald-400/20 to-indigo-400/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
									<span className="text-6xl">🚀</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Academic Tools Section */}
				<div ref={academicSectionRef} className="mb-16">
					<div className="flex items-center mb-8">
						<div>
							<h3 className="text-3xl font-bold text-slate-900">Academic Intelligence</h3>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{academicActions.map((action, idx) => (
							<Link
								key={idx}
								to={action.to}
								ref={(el) => cardRefs.current[idx] = el}
								className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 overflow-hidden shadow-lg"
							>
								<div
									className={`card-overlay absolute inset-0 bg-gradient-to-br ${getColorClasses(action.primaryColor, 'light')} opacity-0`}
								></div>

								<div className="relative z-10">
									<div
										className={`card-icon w-16 h-16 bg-gradient-to-r ${getColorClasses(action.primaryColor)} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
									>
										<span className="text-2xl">{action.icon}</span>
									</div>

									<h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-800">
										{action.title}
									</h4>
									<p className="text-slate-600 leading-relaxed mb-4">
										{action.description}
									</p>

									<div className={`inline-flex items-center px-3 py-1 ${getColorClasses(action.primaryColor, 'light')} rounded-lg mb-4`}>
										<span className={`text-xs font-semibold ${getColorClasses(action.primaryColor, 'text')}`}>
											{action.stats}
										</span>
									</div>

									<div className={`card-arrow flex items-center ${getColorClasses(action.primaryColor, 'text')} font-semibold`}>
										<span>Explore Now</span>
										<svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
										</svg>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* Personal Hub Section */}
				<div ref={personalSectionRef}>
					<div className="flex items-center mb-8">
						<div>
							<h3 className="text-3xl font-bold text-slate-900">Personal Hub</h3>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{personalActions.map((action, idx) => (
							<Link
								key={idx}
								to={action.to}
								ref={(el) => cardRefs.current[academicActions.length + idx] = el}
								className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 overflow-hidden shadow-lg"
							>
								<div
									className={`card-overlay absolute inset-0 bg-gradient-to-br ${getColorClasses(action.primaryColor, 'light')} opacity-0`}
								></div>

								{action.badge > 0 && (
									<div className="absolute top-6 right-6 z-20">
										<div className="relative">
											<div className="w-8 h-8 bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
												{action.badge}
											</div>
											<div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
										</div>
									</div>
								)}

								<div className="relative z-10">
									<div
										className={`card-icon w-16 h-16 bg-gradient-to-r ${getColorClasses(action.primaryColor)} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
									>
										<span className="text-2xl">{action.icon}</span>
									</div>

									<h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-800">
										{action.title}
									</h4>
									<p className="text-slate-600 leading-relaxed mb-4">
										{action.description}
									</p>

									<div className={`inline-flex items-center px-3 py-1 ${getColorClasses(action.primaryColor, 'light')} rounded-lg mb-4`}>
										<span className={`text-xs font-semibold ${getColorClasses(action.primaryColor, 'text')}`}>
											{action.stats}
										</span>
									</div>

									<div className={`card-arrow flex items-center ${getColorClasses(action.primaryColor, 'text')} font-semibold`}>
										<span>Open Hub</span>
										<svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
										</svg>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			</main>
		</div>
	);
}