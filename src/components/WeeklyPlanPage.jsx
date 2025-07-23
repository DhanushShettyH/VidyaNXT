import React, { useEffect, useState } from "react";
import WeeklyPlanView from "../components/WeeklyPlanView";

const WeeklyPlanPage = () => {
  const [teacherData, setTeacherData] = useState(null);

  useEffect(() => {
    const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
    setTeacherData(storedTeacherData);
  }, []);

  if (!teacherData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <WeeklyPlanView teacherData={teacherData} />;
};

export default WeeklyPlanPage;
