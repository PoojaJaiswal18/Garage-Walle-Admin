import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css'; // Import CSS
import { FaHome, FaListUl, FaClipboardList, FaMoneyBillWave, FaCheckCircle } from 'react-icons/fa'; // React Icons

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <button onClick={() => setExpanded(prev => !prev)} className="toggle-button">
          {expanded ? '<' : '>'}
        </button>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <SidebarItem to="/" icon={<FaHome />} text="Home" expanded={expanded} />
          <SidebarItem to="/orders" icon={<FaListUl />} text="Orders" expanded={expanded} />
          <SidebarItem to="/surveyors" icon={<FaClipboardList />} text="Surveyor List" expanded={expanded} />
          <SidebarItem to="/approvals" icon={<FaCheckCircle />} text="Approvals" expanded={expanded} />
          <SidebarItem to="/billing" icon={<FaMoneyBillWave />} text="Billing" expanded={expanded} />
        </ul>
      </nav>
      <div className="sidebar-footer">
      </div>
    </aside>
  );
}

function SidebarItem({ to, icon, text, expanded }) {
  return (
    <li className={`sidebar-item ${expanded ? 'expanded' : 'collapsed'}`}>
      <Link to={to} className="sidebar-link">
        {icon}
        {expanded && <span className="sidebar-text">{text}</span>}
      </Link>
    </li>
  );
}
