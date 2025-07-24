import React, { useState, useEffect, useRef } from 'react';
import { auth, functions } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { gsap } from 'gsap';
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LoadingScreen from './LoadingScreen';
import FeedbackSystem from "./FeedbackSystem";
import FeedbackModal from "./FeedbackModal";
import { httpsCallable } from 'firebase/functions';
import { TodaysPlan } from "./TodaysPlan";
import FloatingVoiceController from "./FloatingVoiceController";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);
//
export default function Home() {
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [wellnessAlerts, setWellnessAlerts] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(-1);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isVoiceControlOpen, setIsVoiceControlOpen] = useState(false);

  const navigate = useNavigate();
  const cardRefs = useRef([]);
  const headerRef = useRef(null);
  const heroRef = useRef(null);
  const academicSectionRef = useRef(null);
  const personalSectionRef = useRef(null);
  const loadingRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const storedTeacherData = sessionStorage.getItem("teacherData");
    const displayName = sessionStorage.getItem("displayName");

    if (!storedTeacherData || !displayName) {
      navigate("/login");
      return;
    }
    // if (!currentUser) {
    // 	navigate("/login");
    // 	return;
    // }
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
      tl.to(loadingRef.current.querySelector(".spinner-outer"), {
        rotation: 360,
        duration: 1.5,
        ease: "power2.inOut",
      }).to(
        loadingRef.current.querySelector(".spinner-inner"),
        {
          rotation: -360,
          duration: 1,
          ease: "power2.inOut",
        },
        0
      );
    }
  }, [loading]);

  // GSAP Page Entry Animation
  useEffect(() => {
    if (!loading && teacherData) {
      const tl = gsap.timeline();

      // Header animation
      tl.fromTo(
        headerRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      )
        // Hero section animation
        .fromTo(
          heroRef.current,
          { y: 50, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" },
          "-=0.4"
        )
        // Academic section title
        .fromTo(
          academicSectionRef.current.querySelector("h3"),
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.2"
        )
        // Personal section title
        .fromTo(
          personalSectionRef.current.querySelector("h3"),
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.4"
        );

      // Animate cards with stagger
      gsap.fromTo(
        cardRefs.current.filter((ref) => ref),
        {
          y: 40,
          opacity: 0,
          scale: 0.9,
          rotateY: -15,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotateY: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.1,
          delay: 0.3,
        }
      );
    }
  }, [loading, teacherData]);

  // Apply hover-like animation to a card
  const applyActiveAnimation = (card, index) => {
    if (!card) return;

    const icon = card.querySelector(".card-icon");
    const overlay = card.querySelector(".card-overlay");
    const arrow = card.querySelector(".card-arrow");

    gsap.to(card, {
      y: -8,
      scale: 1.02,
      boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)",
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(icon, {
      scale: 1.1,
      rotate: 3,
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(overlay, {
      opacity: 0.3,
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(arrow, {
      x: 4,
      duration: 0.4,
      ease: "power2.out",
    });

    setActiveCardIndex(index);
  };

  // Reset card animation
  const resetCardAnimation = (card) => {
    if (!card) return;

    const icon = card.querySelector(".card-icon");
    const overlay = card.querySelector(".card-overlay");
    const arrow = card.querySelector(".card-arrow");

    gsap.to(card, {
      y: 0,
      scale: 1,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(icon, {
      scale: 1,
      rotate: 0,
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(arrow, {
      x: 0,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  // GSAP Scroll-triggered animations (Desktop) and Mobile viewport detection
  useEffect(() => {
    if (!loading && teacherData) {
      // Clean up existing ScrollTriggers and event listeners
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

      // Remove any existing event listeners
      cardRefs.current.forEach((card) => {
        if (card) {
          card.removeEventListener("mouseenter", card._handleMouseEnter);
          card.removeEventListener("mouseleave", card._handleMouseLeave);
          card.removeEventListener("mousedown", card._handleMouseDown);
          card.removeEventListener("mouseup", card._handleMouseUp);
        }
      });

      if (isMobile) {
        // Mobile: Scroll-triggered animations
        cardRefs.current.forEach((card, index) => {
          if (card) {
            ScrollTrigger.create({
              trigger: card,
              start: "top 60%",
              end: "bottom 40%",
              onEnter: () => {
                // Reset previously active card
                if (activeCardIndex !== -1 && activeCardIndex !== index) {
                  const prevCard = cardRefs.current[activeCardIndex];
                  resetCardAnimation(prevCard);
                }
                applyActiveAnimation(card, index);
              },
              onLeave: () => {
                resetCardAnimation(card);
                if (activeCardIndex === index) {
                  setActiveCardIndex(-1);
                }
              },
              onEnterBack: () => {
                // Reset previously active card
                if (activeCardIndex !== -1 && activeCardIndex !== index) {
                  const prevCard = cardRefs.current[activeCardIndex];
                  resetCardAnimation(prevCard);
                }
                applyActiveAnimation(card, index);
              },
              onLeaveBack: () => {
                resetCardAnimation(card);
                if (activeCardIndex === index) {
                  setActiveCardIndex(-1);
                }
              },
            });
          }
        });
      } else {
        // Desktop: Mouse hover animations with single card hover control
        let currentHoveredIndex = -1;

        cardRefs.current.forEach((card, index) => {
          if (card) {
            const icon = card.querySelector(".card-icon");
            const overlay = card.querySelector(".card-overlay");
            const arrow = card.querySelector(".card-arrow");

            const handleMouseEnter = () => {
              // Reset previously hovered card if different
              if (currentHoveredIndex !== -1 && currentHoveredIndex !== index) {
                const prevCard = cardRefs.current[currentHoveredIndex];
                if (prevCard) {
                  const prevIcon = prevCard.querySelector(".card-icon");
                  const prevOverlay = prevCard.querySelector(".card-overlay");
                  const prevArrow = prevCard.querySelector(".card-arrow");

                  gsap.to(prevCard, {
                    y: 0,
                    scale: 1,
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    duration: 0.3,
                    ease: "power2.out",
                  });
                  gsap.to(prevIcon, {
                    scale: 1,
                    rotate: 0,
                    duration: 0.3,
                    ease: "power2.out",
                  });
                  gsap.to(prevOverlay, {
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.out",
                  });
                  gsap.to(prevArrow, {
                    x: 0,
                    duration: 0.3,
                    ease: "power2.out",
                  });
                }
              }

              // Apply hover animation to current card
              currentHoveredIndex = index;
              gsap.to(card, {
                y: -8,
                scale: 1.02,
                boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)",
                duration: 0.3,
                ease: "power2.out",
              });
              gsap.to(icon, {
                scale: 1.1,
                rotate: 3,
                duration: 0.3,
                ease: "power2.out",
              });
              gsap.to(overlay, {
                opacity: 0.3,
                duration: 0.3,
                ease: "power2.out",
              });
              gsap.to(arrow, {
                x: 4,
                duration: 0.3,
                ease: "power2.out",
              });
            };

            const handleMouseLeave = () => {
              if (currentHoveredIndex === index) {
                currentHoveredIndex = -1;
                gsap.to(card, {
                  y: 0,
                  scale: 1,
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  duration: 0.3,
                  ease: "power2.out",
                });
                gsap.to(icon, {
                  scale: 1,
                  rotate: 0,
                  duration: 0.3,
                  ease: "power2.out",
                });
                gsap.to(overlay, {
                  opacity: 0,
                  duration: 0.3,
                  ease: "power2.out",
                });
                gsap.to(arrow, {
                  x: 0,
                  duration: 0.3,
                  ease: "power2.out",
                });
              }
            };

            const handleMouseDown = () => {
              if (currentHoveredIndex === index) {
                gsap.to(card, {
                  scale: 0.98,
                  duration: 0.1,
                  ease: "power2.out",
                });
              }
            };

            const handleMouseUp = () => {
              if (currentHoveredIndex === index) {
                gsap.to(card, {
                  scale: 1.02,
                  duration: 0.1,
                  ease: "power2.out",
                });
              }
            };

            // Store event handlers on the element for cleanup
            card._handleMouseEnter = handleMouseEnter;
            card._handleMouseLeave = handleMouseLeave;
            card._handleMouseDown = handleMouseDown;
            card._handleMouseUp = handleMouseUp;

            card.addEventListener("mouseenter", handleMouseEnter);
            card.addEventListener("mouseleave", handleMouseLeave);
            card.addEventListener("mousedown", handleMouseDown);
            card.addEventListener("mouseup", handleMouseUp);
          }
        });
      }

      // Cleanup function
      return () => {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        // Clean up event listeners
        cardRefs.current.forEach((card) => {
          if (card) {
            card.removeEventListener("mouseenter", card._handleMouseEnter);
            card.removeEventListener("mouseleave", card._handleMouseLeave);
            card.removeEventListener("mousedown", card._handleMouseDown);
            card.removeEventListener("mouseup", card._handleMouseUp);
          }
        });
      };
    }
  }, [loading, teacherData, isMobile, activeCardIndex]);

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
      <>
        <LoadingScreen title={"loading"} />
      </>
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
      description:
        "Generate hyper-local, multi-grade educational content instantly",
      primaryColor: "indigo",
      stats: "Generate in minutes",
    },
    {
      to: "/content-library",
      icon: "📚",
      title: "Knowledge Vault",
      description: "Your curated collection of AI-generated teaching resources",
      primaryColor: "emerald",
      stats: "Always accessible",
    },
    {
      to: "/peer-advice",
      icon: "🤝",
      title: "Teacher Network",
      description:
        "Connect with India's distributed teaching intelligence community",
      primaryColor: "indigo",
      stats: "50,000+ teachers",
    },
  ];

  const personalActions = [
    {
      to: "/peers",
      icon: "💬",
      title: "Community Chat",
      description: "Real-time conversations with your teaching peers",
      primaryColor: "emerald",
      badge: unreadTotal,
      stats: unreadTotal > 0 ? `${unreadTotal} unread` : "Stay connected",
    },
    {
      to: "/training-hub",
      icon: "⚡",
      title: "Training Hub",
      description: "personalized learning path",
      primaryColor: "indigo",
      badge: unreadTotal,
      stats: unreadTotal > 0 ? `${unreadTotal} unread` : "Develop skills",
    },
    {
      to: "/wellness-dashboard",
      icon: "🧘",
      title: "Wellness Intelligence",
      description: "AI-powered insights for sustainable teaching practices",
      primaryColor: "emerald",
      badge: wellnessAlerts,
      stats: wellnessAlerts > 0 ? `${wellnessAlerts} alerts` : "Monitor health",
    },
  ];

  const getColorClasses = (color, variant = "default") => {
    const colorMap = {
      indigo: {
        default: "from-indigo-600 to-indigo-800",
        light: "from-indigo-50 to-indigo-100",
        text: "text-indigo-700",
        bg: "bg-indigo-600",
        hover: "hover:bg-indigo-700",
        border: "border-indigo-200",
      },
      emerald: {
        default: "from-emerald-600 to-emerald-800",
        light: "from-emerald-50 to-emerald-100",
        text: "text-emerald-700",
        bg: "bg-emerald-600",
        hover: "hover:bg-emerald-700",
        border: "border-emerald-200",
      },
    };
    return colorMap[color]?.[variant] || colorMap.indigo[variant];
  };

  // ! feed back

  const handleOpenFeedbackModal = () => {
    setShowFeedbackModal(true);
  };

  const handleCloseFeedbackModal = () => {
    setShowFeedbackModal(false);
  };

  // Handle outside click to close modal
  const handleModalBackdropClick = (e) => {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      handleCloseFeedbackModal();
    }
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
                {/* <p className="text-sm text-slate-600 font-medium tracking-wide">AI Teaching Intelligence Platform</p> */}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-emerald-50 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">
                  AI Active
                </span>
              </div>
              <button
                onClick={handleLogout}
                className={`${
                  isMobile ? "p-3" : "px-6 py-3"
                } bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center`}
                title={isMobile ? "Sign Out" : ""}
              >
                {isMobile ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
                    />
                  </svg>
                ) : (
                  "Sign Out"
                )}
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
            className="relative bg-gradient-to-r from-indigo-900 via-indigo-800 to-emerald-800 rounded-3xl p-3 overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gray-100 bg-repeat"></div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <TodaysPlan teacherData={teacherData} />

                  {/* Floating Feedback Button */}
                  <FeedbackSystem
                    onOpenFeedbackModal={handleOpenFeedbackModal}
                    teacherId={teacherData.ownerUid || teacherData.id}
                    teacherData={teacherData}
                  />
                </div>
                {/* 
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
								</div> */}
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
              <h3 className="text-3xl font-bold text-slate-900">
                Academic Intelligence
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {academicActions.map((action, idx) => (
              <Link
                key={idx}
                to={action.to}
                ref={(el) => (cardRefs.current[idx] = el)}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 overflow-hidden shadow-lg"
              >
                <div
                  className={`card-overlay absolute inset-0 bg-gradient-to-br ${getColorClasses(
                    action.primaryColor,
                    "light"
                  )} opacity-0`}
                ></div>

                <div className="relative z-10">
                  <div
                    className={`card-icon w-16 h-16 bg-gradient-to-r ${getColorClasses(
                      action.primaryColor
                    )} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                  >
                    <span className="text-2xl">{action.icon}</span>
                  </div>

                  <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-800">
                    {action.title}
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    {action.description}
                  </p>

                  <div
                    className={`inline-flex items-center px-3 py-1 ${getColorClasses(
                      action.primaryColor,
                      "light"
                    )} rounded-lg mb-4`}
                  >
                    <span
                      className={`text-xs font-semibold ${getColorClasses(
                        action.primaryColor,
                        "text"
                      )}`}
                    >
                      {action.stats}
                    </span>
                  </div>

                  <div
                    className={`card-arrow flex items-center ${getColorClasses(
                      action.primaryColor,
                      "text"
                    )} font-semibold`}
                  >
                    <span>Explore Now</span>
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      ></path>
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
              <h3 className="text-3xl font-bold text-slate-900">
                Personal Hub
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {personalActions.map((action, idx) => (
              <Link
                key={idx}
                to={action.to}
                ref={(el) =>
                  (cardRefs.current[academicActions.length + idx] = el)
                }
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 overflow-hidden shadow-lg"
              >
                <div
                  className={`card-overlay absolute inset-0 bg-gradient-to-br ${getColorClasses(
                    action.primaryColor,
                    "light"
                  )} opacity-0`}
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
                    className={`card-icon w-16 h-16 bg-gradient-to-r ${getColorClasses(
                      action.primaryColor
                    )} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                  >
                    <span className="text-2xl">{action.icon}</span>
                  </div>

                  <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-800">
                    {action.title}
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    {action.description}
                  </p>

                  <div
                    className={`inline-flex items-center px-3 py-1 ${getColorClasses(
                      action.primaryColor,
                      "light"
                    )} rounded-lg mb-4`}
                  >
                    <span
                      className={`text-xs font-semibold ${getColorClasses(
                        action.primaryColor,
                        "text"
                      )}`}
                    >
                      {action.stats}
                    </span>
                  </div>

                  <div
                    className={`card-arrow flex items-center ${getColorClasses(
                      action.primaryColor,
                      "text"
                    )} font-semibold`}
                  >
                    <span>Open Hub</span>
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      ></path>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      {/* Floating Voice Controller */}
      <FloatingVoiceController
        isOpen={isVoiceControlOpen}
        onToggle={setIsVoiceControlOpen}
        userId={teacherData.id}
      />
      {showFeedbackModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleModalBackdropClick}
        >
          <FeedbackModal
            teacherId={teacherData.ownerUid || teacherData.id}
            teacherData={teacherData}
            onClose={handleCloseFeedbackModal}
          />
        </div>
      )}
    </div>
  );
}

