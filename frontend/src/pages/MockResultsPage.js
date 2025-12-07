import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// MockResultsPage removed - redirecting to real Search page
const MockResultsPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/search", { replace: true });
  }, [navigate]);
  return null;
};

export default MockResultsPage;
