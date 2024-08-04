import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/SurveyorList.css';

export default function SurveyorList() {
  const [surveyors, setSurveyors] = useState([]);
  const location = useLocation();
  const orderId = new URLSearchParams(location.search).get('orderId');
  const navigate = useNavigate();

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

  const handleAssign = async (surveyorId) => {
    try {
      const orderDoc = doc(db, 'orders', orderId);
      await updateDoc(orderDoc, { isAssigned: true, surveyorId });
      navigate('/orders');
    } catch (error) {
      console.error("Error assigning surveyor:", error);
    }
  };

  return (
    <div className="surveyor-list-page">
      <div className="surveyor-title">Surveyor List</div>
      <ul>
        <li className="surveyor-header">
          <span>Name</span>
          {/* <span>SurveyorId</span> */}
          <span>Location</span>
          <span>Assign</span>
        </li>
        {surveyors.length === 0 ? (
          <li>No surveyors available.</li>
        ) : (
          surveyors.map(surveyor => (
            <li key={surveyor.id} className="surveyor-item">
              <span>{surveyor.name}</span>
              {/* <span>{surveyor.id}</span> */}
              <span>{surveyor.location}</span>
              <span>
              <button
                className="assign-surveyor"
                onClick={() => handleAssign(surveyor.id)}
              >
                Assign              </button>

                </span>
              
            </li>
          ))
        )}
      </ul>
    </div>
  );
}


