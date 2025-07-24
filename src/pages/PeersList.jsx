// src/pages/PeersList.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
	doc,
	getDoc,
	collection,
	query,
	where,
	onSnapshot,
	getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { AI_PEER_ID, AI_PEER_NAME } from "../constants";
import Header from "../components/Header";

export default function PeersList() {
	const [teacherData, setTeacherData] = useState(null);
	const [peers, setPeers] = useState([]);
	const [peerNames, setPeerNames] = useState({
		[AI_PEER_ID]: AI_PEER_NAME,
	});
	const [unreadMap, setUnreadMap] = useState({});
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	// Load teacherData
	useEffect(() => {
		const stored = sessionStorage.getItem("teacherData");
		if (!stored) {
			navigate("/login");
			return;
		}
		setTeacherData(JSON.parse(stored));
		setLoading(false);
	}, [navigate]);

	// Fetch peers list
	useEffect(() => {
		if (!teacherData) return;
		setLoading(true);
		(async () => {
			try {
				const ref = doc(db, "teachers", teacherData.id);
				const snap = await getDoc(ref);
				const rawPeers = snap.data()?.peers || [];

				// If AI_PEER_ID isn’t already in there, add it up front; otherwise leave as‑is
				const withAi = rawPeers.includes(AI_PEER_ID)
					? rawPeers
					: [AI_PEER_ID, ...rawPeers];

				setPeers(withAi);
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		})();
	}, [teacherData]);

	// Fetch peer display names
	useEffect(() => {
		peers.forEach((peerId) => {
			// skip the AI peer, we already know its name
			if (peerId === AI_PEER_ID) return;
			// if we've already loaded this name, skip
			if (peerNames[peerId]) return;
			// otherwise fetch from Firestore
			getDoc(doc(db, "teachers", peerId))
				.then((snap) => {
					setPeerNames((p) => ({
						...p,
						[peerId]: snap.data()?.displayName || peerId,
					}));
				})
				.catch(console.error);
		});
	}, [peers, peerNames]);

	// Listen for unread counts
	useEffect(() => {
		if (!teacherData || peers.length === 0) return;
		const teacherId = teacherData.id;
		const unsubscribers = peers.map((peerId) => {
			const q = query(
				collection(db, "conversations"),
				where("members", "array-contains", teacherId)
			);
			return onSnapshot(q, (snap) => {
				snap.docs.forEach((docSnap) => {
					const { members, unreadCounts = {} } = docSnap.data();
					if (members.includes(peerId) && members.length === 2) {
						setUnreadMap((prev) => ({
							...prev,
							[peerId]: unreadCounts[teacherId] || 0,
						}));
					}
				});
			});
		});
		return () => unsubscribers.forEach((u) => u());
	}, [teacherData, peers]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-gray-600">Loading peers…</div>
			</div>
		);
	}

	// Open existing chat only
	const handleChat = async (peerId) => {
		setLoading(true);
		try {
			const teacherId = teacherData.id;
			if (peerId === AI_PEER_ID) {
				// Navigate to a special “AI chat” route
				navigate(`/chat/ai`);
				return;
			}
			console.log(peerId, teacherId);
			const q = query(
				collection(db, "conversations"),
				where("members", "array-contains", teacherId)
			);
			const snaps = await getDocs(q);

			const existing = snaps.docs.find((docSnap) => {
				const m = docSnap.data().members;
				return m.includes(peerId) && m.length === 2;
			});

			if (existing) {
				navigate(`/chat/${existing.id}`);
			} else {
				alert("No conversation found. Wait for the other user to start it.");
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Header Heading={"Connected Peers"} />

			<div className="min-h-screen  bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
				<div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
					{/* <h1 className="text-2xl font-bold mb-4">Your Connected Peers</h1> */}
					{peers.length === 0 ? (
						<p className="text-gray-600">
							You haven't connected with any peers yet.
						</p>
					) : (
						<ul className="space-y-2">
							{peers.map((peerId) => (
								<li key={peerId}>
									<button
										onClick={() => handleChat(peerId)}
										className="w-full text-left bg-white p-4 rounded-lg shadow hover:bg-gray-100 flex justify-between items-center"
									>
										<span>{peerNames[peerId] || peerId}</span>
										{unreadMap[peerId] > 0 && (
											<span className="ml-4 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
												{unreadMap[peerId]}
											</span>
										)}
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</>
	);
}
