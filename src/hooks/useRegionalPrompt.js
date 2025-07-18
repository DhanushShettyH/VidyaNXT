// src/hooks/useRegionalPrompt.js
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export const useRegionalPrompt = (teacherData) => {
  const [regionalContext, setRegionalContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegionalContext = async () => {
      if (!teacherData?.matchingCriteria?.location) return;

      try {
        const location = teacherData.matchingCriteria.location.toLowerCase();
        const language = teacherData.aiPreferences?.language || "marathi";

        const docRef = doc(db, "regional_prompts", language, location);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRegionalContext(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching regional context:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegionalContext();
  }, [teacherData]);

  return { regionalContext, loading };
};
