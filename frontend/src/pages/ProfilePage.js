import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Legacy combined profile page replaced by new profile layout and pages
const ProfilePage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/profile", { replace: true });
  }, [navigate]);
  return null;
};

export default ProfilePage;
