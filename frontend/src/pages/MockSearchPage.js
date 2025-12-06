import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// MockSearchPage removed - redirecting to real Search page
const MockSearchPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/search", { replace: true });
  }, [navigate]);
  return null;
};

export default MockSearchPage;
