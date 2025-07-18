// src/components/AdminInitialization.jsx
import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const AdminInitialization = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const initializeCollections = async () => {
    setLoading(true);
    setStatus("Initializing Sahayak collections...");

    try {
      const initFunction = httpsCallable(
        functions,
        "initializeSahayakCollections"
      );
      const result = await initFunction();

      setStatus("✅ Collections initialized successfully!");
      console.log("Initialization result:", result.data);
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      console.error("Initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">
        Admin: Initialize Sahayak Collections
      </h2>
      <p className="text-gray-600 mb-4">
        This will set up all the required Firestore collections for the Sahayak
        system.
      </p>

      <button
        onClick={initializeCollections}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Initializing..." : "Initialize Collections"}
      </button>

      {status && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm">{status}</p>
        </div>
      )}
    </div>
  );
};

export default AdminInitialization;
