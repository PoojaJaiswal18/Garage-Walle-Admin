import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, doc, updateDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../styles/Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Setup real-time listeners for garages and bookings
    const setupRealTimeListeners = () => {
      const garagesCollection = collection(db, 'garages');

      // Listener for the garages collection
      const unsubscribeGarages = onSnapshot(garagesCollection, (garagesSnapshot) => {
        const allBookingsData = [];

        // Function to setup listener for bookings in each garage
        const setupBookingsListener = (garageDoc) => {
          const bookingsCollection = collection(garageDoc.ref, 'bookings');

          // Listener for bookings in the current garage
          return onSnapshot(bookingsCollection, (bookingsSnapshot) => {
            const bookingsData = [];
            bookingsSnapshot.forEach(bookingDoc => {
              bookingsData.push({
                id: bookingDoc.id,
                ...bookingDoc.data(),
                garageName: garageDoc.data().name,
                garageLocation: garageDoc.data().location,
              });
            });

            // Update the state with the new bookings data
            setOrders(prevOrders => {
              // Create a map for easy lookup
              const ordersMap = new Map(prevOrders.map(order => [order.id, order]));

              // Add new bookings to the map, overwriting existing ones
              bookingsData.forEach(booking => {
                ordersMap.set(booking.id, booking);
              });

              // Convert the map back to an array
              return Array.from(ordersMap.values());
            });
          });
        };

        // Setup real-time listeners for each garage's bookings
        const unsubscribeBookingsListeners = garagesSnapshot.docs.map(garageDoc => setupBookingsListener(garageDoc));

        // Cleanup function to remove all listeners
        return () => {
          unsubscribeGarages();
          unsubscribeBookingsListeners.forEach(unsub => unsub());
        };
      });
    };

    setupRealTimeListeners();
  }, []);

  const handleAssignSurveyor = (orderId) => {
    navigate(`/surveyors?orderId=${orderId}`);
  };

  const toggleSurveyorAssigned = async (garageId, bookingId, isAssigned, surveyorId) => {
    try {
      const bookingDoc = doc(db, 'garages', garageId, 'bookings', bookingId);
      const surveyorDoc = doc(db, 'surveyors', surveyorId);

      if (isAssigned) {
        // Remove surveyor assignment
        await updateDoc(bookingDoc, {
          isSurveyorAssigned: false,
          surveyorId: deleteField() // Remove surveyorId field
        });
        await updateDoc(surveyorDoc, {
          orderId: deleteField() // Remove orderId field
        });
      } else {
        // Assign a surveyor
        await updateDoc(bookingDoc, {
          isSurveyorAssigned: true,
          surveyorId
        });
        await updateDoc(surveyorDoc, {
          orderId: bookingId
        });
      }

      // Update local state
      setOrders(prevOrders => prevOrders.map(order =>
        order.id === bookingId ? { ...order, isSurveyorAssigned: !isAssigned } : order
      ));
    } catch (error) {
      console.error("Error toggling surveyor assigned status:", error);
    }
  };

  return (
    <div className="orders-page">
      <div className="orders-title">Orders</div>
      {orders.length === 0 ? (
        <p>No orders available.</p>
      ) : (
        <div className="orders-table">
          <div className="orders-header">
            <div className="header-item">Order ID</div>
            <div className="header-item">Status</div>
            <div className="header-item">Garage Name</div>
            <div className="header-item">Garage Location</div>
            <div className="header-item">Assigning Status</div>
            <div className="header-item">Assign Surveyor</div>
          </div>
          <ul className="orders-list">
            {orders.map(order => (
              <li key={order.id} className="order-item">
                <div className="order-item-cell">{order.id}</div>
                <div className="order-item-cell">{order.isSurveyorAssigned ? 'Assigned' : 'Not Assigned'}</div>
                <div className="order-item-cell">{order.garageName}</div>
                <div className="order-item-cell">
                  {order.garageLocation.latitude}, {order.garageLocation.longitude}
                </div>
                <div className="order-item-cell">
                  <button 
                    className={`is-surveyor-assigned ${order.isSurveyorAssigned ? 'assigned' : 'not-assigned'}`}
                    onClick={() => toggleSurveyorAssigned(order.garageId, order.id, order.isSurveyorAssigned, order.surveyorId)}
                  >
                    {order.isSurveyorAssigned ? 'Assigned' : 'Not Assigned'}
                  </button>
                </div>
                <div className="order-item-cell">
                  <button 
                    className="assign-surveyor"
                    onClick={() => handleAssignSurveyor(order.id)}
                    disabled={order.isSurveyorAssigned}
                  >
                    Assign Surveyor
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

