import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { SidebarContext } from "./Sidebar";
import "./Sidebar.css";

// SidebarItem Component
const SidebarItem = ({ icon, text, to, active }) => {
  const { expanded } = useContext(SidebarContext);

  return (
    <li className="sidebar-item">
      <NavLink to={to} className={`sidebar-link ${active ? "active" : ""}`}>
        {icon}
        <span className={`sidebar-text ${expanded ? "show" : "hide"}`}>{text}</span>
      </NavLink>
    </li>
  );
};

export default SidebarItem;
