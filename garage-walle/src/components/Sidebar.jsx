import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaListUl, FaClipboardList, FaMoneyBillWave, FaCheckCircle, FaUser, FaTools, FaWrench } from 'react-icons/fa'; // Import FaWrench
import './Sidebar.css';
import logo from '../assets/logo.png';
import LoginForm from './LoginForm';

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogin = (username) => {
    setUser({ name: username });
    setShowLoginModal(false);
  };

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className={`logo-container ${expanded ? 'expanded' : 'collapsed'}`}>
          {/* <img 
            src={logo} 
            alt="Company Logo" 
            className={`logo ${expanded ? 'expanded' : 'collapsed'}`}
            onClick={() => setExpanded(prev => !prev)}
          /> */}
          {expanded && <span className="logo-text">Garage Walle</span>}
        </div>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <SidebarItem to="/" icon={<FaHome />} text="Home" expanded={expanded} />
          <SidebarItem to="/orders" icon={<FaListUl />} text="Garage Booking" expanded={expanded} />
          <SidebarItem to="/surveyors" icon={<FaClipboardList />} text="Surveyor List" expanded={expanded} />
          <SidebarItem to="/approvals" icon={<FaCheckCircle />} text="Approvals" expanded={expanded} />
          <SidebarItem to="/billing" icon={<FaMoneyBillWave />} text="Billing" expanded={expanded} />
          <SidebarItem to="/mechanics" icon={<FaWrench />} text="Mechanic List" expanded={expanded} /> 
          <SidebarItem to="/mechanic-bookings" icon={<FaTools />} text="Mechanic Bookings" expanded={expanded} />
        </ul>
      </nav>
      <div className="sidebar-footer">
        <div className="profile-section">
          <FaUser className="profile-icon" />
          {expanded && (
            <div className="profile-info">
              {user ? (
                <span>{user.name}</span>
              ) : (
                <button className="login-button" onClick={() => setShowLoginModal(true)}>
                  Log in
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showLoginModal && <LoginForm onLogin={handleLogin} onClose={() => setShowLoginModal(false)} />}
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

