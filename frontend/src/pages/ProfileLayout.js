import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import "../styles/ProfilePage.css";

const ProfileLayout = () => {
  return (
    <div className="profile-page">
      <NavBar />
      <div className="profile-content layout-with-menu">
        <aside className="profile-side">
          <nav className="profile-menu">
            <NavLink
              to="."
              end
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              My Profile
            </NavLink>
            <NavLink
              to="settings"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Account Settings
            </NavLink>
          </nav>
        </aside>
        <main className="profile-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProfileLayout;
