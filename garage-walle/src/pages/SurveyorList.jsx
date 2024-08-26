import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/SurveyorList.css';

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLon / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function SurveyorList() {
  const [surveyors, setSurveyors] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = new URLSearchParams(location.search).get('orderId');
  const garageId = new URLSearchParams(location.search).get('garageId');
  const [garageLocation, setGarageLocation] = useState(null);
  const showDistance = Boolean(orderId && garageId);

  useEffect(() => {
    const unsubscribeSurveyors = onSnapshot(collection(db, 'surveyors'), (querySnapshot) => {
      const surveyorsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (garageLocation && showDistance) {
        surveyorsData.sort((a, b) => {
          const distanceA = getDistanceFromLatLonInKm(
            garageLocation.latitude,
            garageLocation.longitude,
            a.location.latitude,
            a.location.longitude
          );
          const distanceB = getDistanceFromLatLonInKm(
            garageLocation.latitude,
            garageLocation.longitude,
            b.location.latitude,
            b.location.longitude
          );
          return distanceA - distanceB;
        });
      }

      setSurveyors(surveyorsData);
    });

    return () => unsubscribeSurveyors();
  }, [garageLocation, showDistance]);

  useEffect(() => {
    if (orderId && garageId) {
      const unsubscribeOrder = onSnapshot(doc(db, `garages/${garageId}/bookings`, orderId), async (orderDoc) => {
        if (orderDoc.exists()) {
          const orderData = orderDoc.data();
          const garageDoc = await getDoc(doc(db, 'garages', garageId));
          if (garageDoc.exists()) {
            const garageData = garageDoc.data();
            setGarageLocation(garageData.location);
          }
        } else {
          console.error("Order does not exist");
        }
      });

      return () => unsubscribeOrder();
    }
  }, [orderId, garageId]);

  const handleAssign = async (surveyorId) => {
    try {
      const orderDoc = doc(db, `garages/${garageId}/bookings`, orderId);
      const surveyorDoc = doc(db, 'surveyors', surveyorId);

      const orderSnap = await getDoc(orderDoc);
      const orderData = orderSnap.data();

      if (orderData.isSurveyorAssigned) {
        await updateDoc(orderDoc, {
          isSurveyorAssigned: false,
          surveyorId: deleteField(),
        });
        await updateDoc(surveyorDoc, {
          ongoingBookings: deleteField(),
        });
      } else {
        await updateDoc(orderDoc, {
          isSurveyorAssigned: true,
          surveyorId,
        });
        await updateDoc(surveyorDoc, {
          ongoingBookings: [orderId],
        });
      }

      navigate('/orders');
    } catch (error) {
      console.error("Error assigning surveyor:", error);
    }
  };

  return (
    <div className="surveyor-list">
      <div className="surveyors-title">Surveyors List</div>
      {surveyors.length === 0 ? (
        <p>No surveyors available.</p>
      ) : (
        <div className="surveyors-table">
          <div className="surveyors-header">
            <div className="header-item">Surveyor Name</div>
            <div className="header-item">Location</div>
            {showDistance && <div className="header-item">Distance</div>}
            <div className="header-item">Assign</div>
          </div>
          <ul className="surveyors-list">
            {surveyors.map(surveyor => (
              <li key={surveyor.id} className="surveyor-item">
                <div className="surveyor-item-cell">{surveyor.name}</div>
                <div className="surveyor-item-cell">
                  {surveyor.location.latitude}, {surveyor.location.longitude}
                </div>
                {showDistance && (
                  <div className="surveyor-item-cell">
                    {garageLocation ? `${getDistanceFromLatLonInKm(garageLocation.latitude, garageLocation.longitude, surveyor.location.latitude, surveyor.location.longitude).toFixed(2)} km` : 'N/A'}
                  </div>
                )}
                <div className="surveyor-item-cell">
                  <button className="assign-button" onClick={() => handleAssign(surveyor.id)}>
                    Assign
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
