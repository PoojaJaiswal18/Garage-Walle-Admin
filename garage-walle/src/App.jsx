// App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import SurveyorList from "./pages/SurveyorList";
import Billing from "./pages/Billing";
import MechanicList from './pages/MechanicList'; 
import MechanicBookings from './pages/MechanicBookings'; 
import Approvals from "./pages/Approvals";
import BillApproval from "./pages/BillApproval.jsx";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'; 

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/surveyors" element={<SurveyorList />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/mechanic-list" element={<MechanicList />} />
            <Route path="/mechanics" element={<MechanicList />} /> 
            <Route path="/mechanic-bookings" element={<MechanicBookings />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/bill-approval" element={<BillApproval />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
