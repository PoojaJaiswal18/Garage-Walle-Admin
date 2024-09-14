import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, writeBatch, deleteField } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../styles/Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const garagesCollection = collection(db, 'garages');

    const unsubscribeGarages = onSnapshot(garagesCollection, (garagesSnapshot) => {
      const allBookingsData = [];

      const setupBookingsListener = (garageDoc) => {
        const bookingsCollection = collection(garageDoc.ref, 'bookings');

        return onSnapshot(bookingsCollection, (bookingsSnapshot) => {
          const bookingsData = [];
          bookingsSnapshot.forEach(bookingDoc => {
            const bookingData = bookingDoc.data();
            bookingsData.push({
              id: bookingDoc.id,
              ...bookingData,
              garageName: garageDoc.data().name,
              garageLocation: garageDoc.data().location,
              garageId: garageDoc.id, // Add garageId for easy reference
              customerName: bookingData.bookedBy, // Add customerName
              customerAddress: bookingData.bookingLocationAddress // Add customerAddress
            });
          });

          setOrders(prevOrders => {
            const ordersMap = new Map(prevOrders.map(order => [order.id, order]));
            bookingsData.forEach(booking => {
              ordersMap.set(booking.id, booking);
            });
            return Array.from(ordersMap.values());
          });
        });
      };

      const unsubscribeBookingsListeners = garagesSnapshot.docs.map(garageDoc => setupBookingsListener(garageDoc));

      return () => {
        unsubscribeGarages();
        unsubscribeBookingsListeners.forEach(unsub => unsub());
      };
    });
  }, []);

  const handleAssignSurveyor = (orderId, garageId) => {
    navigate(`/surveyors?orderId=${orderId}&garageId=${garageId}`);
  };

  const toggleSurveyorAssigned = async (garageId, bookingId, isAssigned, surveyorId) => {
    try {
      const bookingDocRef = doc(db, 'garages', garageId, 'bookings', bookingId);
      const surveyorDocRef = doc(db, 'surveyors', surveyorId);

      const batch = writeBatch(db);

      if (isAssigned) {
        batch.update(bookingDocRef, {
          isSurveyorAssigned: false,
          surveyorId: deleteField(), // Remove the surveyorId from booking
        });
        batch.update(surveyorDocRef, {
          ongoingBookings: arrayRemove(bookingDocRef), // Remove reference from ongoingBookings
        });
      } else {
        batch.update(bookingDocRef, {
          isSurveyorAssigned: true,
          surveyorId: surveyorId, // Store the surveyorId in booking
        });
        batch.update(surveyorDocRef, {
          ongoingBookings: arrayUnion(bookingDocRef), // Add reference to ongoingBookings
        });
      }

      await batch.commit();
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
            <div className="header-item">Customer Name</div>
            <div className="header-item">Customer Address</div>
            <div className="header-item">Garage Name</div>
            <div className="header-item">Garage Location</div>
            <div className="header-item">Assigning Status</div>
            <div className="header-item">Assign Surveyor</div>
          </div>
          <ul className="orders-list">
            {orders.map(order => (
              <li key={order.id} className="order-item">
                <div className="order-item-cell">{order.customerName}</div>
                <div className="order-item-cell">{order.customerAddress}</div>
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
                    onClick={() => handleAssignSurveyor(order.id, order.garageId)}
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
