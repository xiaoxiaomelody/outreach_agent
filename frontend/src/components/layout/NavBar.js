import React, { useRef, useState, useEffect } from "react";
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

    const [menuOpen, setMenuOpen] = useState(false);
    const wrapperRef = useRef(null);

    const handleLogout = async () => {
        await logOut();
        navigate("/");
    };

    // close dropdown when clicking outside
    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

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
                    <div className="navbar-user" ref={wrapperRef}>
                        <div className="user-avatar">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                        </div>
                        <button
                            className={`user-dropdown ${menuOpen ? "open" : ""}`}
                            onClick={() => setMenuOpen((s) => !s)}
                            aria-haspopup="true"
                            aria-expanded={menuOpen}
                        >
                            ▼
                        </button>

                        {menuOpen && (
                            <div className="user-menu" role="menu">
                                <button className="user-menu-item" onClick={() => { setMenuOpen(false); handleLogout(); }} role="menuitem">
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;

