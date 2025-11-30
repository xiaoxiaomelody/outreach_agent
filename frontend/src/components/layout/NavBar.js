import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logOut, getCurrentUser } from "../../config/authUtils";
import "./NavBar.css";

/**
 * Navigation Bar Component
 * Shared navigation across all pages
 */
const NavBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    const handleLogout = async () => {
        await logOut();
        navigate("/");
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <div className="navbar-left">
                    <h1 className="navbar-logo">Outreach Agent</h1>
                </div>
                <div className="navbar-right">
                    <button
                        className={`navbar-link ${isActive("/templates") ? "active" : ""}`}
                        onClick={() => navigate("/templates")}
                    >
                        Templates
                    </button>
                    <button
                        className={`navbar-link ${isActive("/my-list") ? "active" : ""}`}
                        onClick={() => navigate("/my-list")}
                    >
                        My List
                    </button>
                    <button
                        className={`navbar-link ${isActive("/search") || isActive("/dashboard") ? "active" : ""}`}
                        onClick={() => navigate("/search")}
                    >
                        Search
                    </button>
                    <div className="navbar-user">
                        <div className="user-avatar">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                        </div>
                        <button className="user-dropdown" onClick={handleLogout}>
                            ▼
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;

