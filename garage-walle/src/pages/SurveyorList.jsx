// src/pages/SurveyorList.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import '../styles/SurveyorList.css';

export default function SurveyorList() {
  const [surveyors, setSurveyors] = useState([]);
  const location = useLocation();
  const orderId = new URLSearchParams(location.search).get('orderId');

  useEffect(() => {
    const fetchSurveyors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'surveyors'));
        const surveyorsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSurveyors(surveyorsData);
      } catch (error) {
        console.error("Error fetching surveyors:", error);
      }
    };

    fetchSurveyors();
  }, []);

  const handleAssign = (surveyorId) => {
    // Logic to assign the surveyor to the order
  };

  return (
    <div className="surveyor-list-page">
      <h1>Surveyor List Page</h1>
      {surveyors.length === 0 ? (
        <p>No surveyors available.</p>
      ) : (
        <ul>
          {surveyors.map(surveyor => (
            <li key={surveyor.id} className="surveyor-item">
              <span>{surveyor.name}</span>
              <button 
                className="assign-surveyor"
                onClick={() => handleAssign(surveyor.id)}
              >
                Assign to Order {orderId}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
