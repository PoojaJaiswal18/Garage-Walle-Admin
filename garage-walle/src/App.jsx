import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import SurveyorList from "./pages/SurveyorList";
import Billing from "./pages/Billing";
import Approvals from "./pages/Approvals"; // Import the new Approvals page
import './App.css'; // Import global styles

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
            <Route path="/approvals" element={<Approvals />} /> {/* Add this line */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
