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
  const garageId = new URLSearchParams(location.search).get('garageId');
  const [garageLocation, setGarageLocation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeSurveyors = onSnapshot(collection(db, 'surveyors'), (querySnapshot) => {
      const surveyorsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (garageLocation) {
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
  }, [garageLocation]);

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

      // Fetch the current state of the order to determine if a surveyor is already assigned
      const orderSnap = await getDoc(orderDoc);
      const orderData = orderSnap.data();

      if (orderData.isSurveyorAssigned) {
        // Remove the existing assignment
        await updateDoc(orderDoc, {
          isSurveyorAssigned: false,
          surveyorId: deleteField()
        });
        await updateDoc(surveyorDoc, {
          orderId: deleteField()
        });
      } else {
        // Assign the new surveyor
        await updateDoc(orderDoc, {
          isSurveyorAssigned: true,
          surveyorId
        });
        await updateDoc(surveyorDoc, {
          orderId
        });
      }

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
                  {surveyor.orderId ? 'Unassign' : 'Assign'}
                </button>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

