import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/SurveyorList.css';


function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Function to calculate distance between two coordinates 
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

export default function SurveyorList() {
  const [surveyors, setSurveyors] = useState([]);
  const location = useLocation();
  const orderId = new URLSearchParams(location.search).get('orderId');
  const [garageLocation, setGarageLocation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSurveyors = async () => {
      try {
        // Fetch surveyors from Firestore
        const querySnapshot = await getDocs(collection(db, 'surveyors'));
        const surveyorsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // If an orderId is present, fetch the order details and sort the surveyors
        if (orderId) {
          const orderDoc = await getDoc(doc(db, 'orders', orderId));
          if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            setGarageLocation(orderData.garageLocation);

            if (orderData.garageLocation) {
              surveyorsData.sort((a, b) => {
                const distanceA = getDistanceFromLatLonInKm(
                  orderData.garageLocation.latitude,
                  orderData.garageLocation.longitude,
                  a.location.latitude,
                  a.location.longitude
                );
                const distanceB = getDistanceFromLatLonInKm(
                  orderData.garageLocation.latitude,
                  orderData.garageLocation.longitude,
                  b.location.latitude,
                  b.location.longitude
                );
                return distanceA - distanceB;
              });
            }
          } else {
            console.error("Order does not exist");
          }
        }

        setSurveyors(surveyorsData);
      } catch (error) {
        console.error("Error fetching surveyors:", error);
      }
    };

    fetchSurveyors();
  }, [orderId]);

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
          <span>Location</span>
          <span>Assign</span>
        </li>
        {surveyors.length === 0 ? (
          <li>No surveyors available.</li>
        ) : (
          surveyors.map(surveyor => (
            <li key={surveyor.id} className="surveyor-item">
              <span>{surveyor.name}</span>
              <span>{`${surveyor.location.latitude}, ${surveyor.location.longitude}`}</span>
              <span>
                <button
                  className="assign-surveyor"
                  onClick={() => handleAssign(surveyor.id)}
                >
                  Assign
                </button>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
