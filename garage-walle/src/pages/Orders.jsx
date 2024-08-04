// src/pages/Orders.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../styles/Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const handleAssignSurveyor = (orderId) => {
    navigate(`/surveyors?orderId=${orderId}`);
  };

  const toggleSurveyorAssigned = async (orderId, isAssigned) => {
    const orderDoc = doc(db, 'orders', orderId);
    await updateDoc(orderDoc, { isSurveyorAssigned: !isAssigned });
    setOrders(prevOrders => prevOrders.map(order => order.id === orderId ? { ...order, isSurveyorAssigned: !isAssigned } : order));
  };

  return (
    <div className="orders-page">
      <h1>Orders Page</h1>
      {orders.length === 0 ? (
        <p>No orders available.</p>
      ) : (
        <ul>
          {orders.map(order => (
            <li key={order.id} className="order-item">
              <span>{order.orderId}</span>
              <span>{order.Tag}</span>
              {order.Tag === 'garage' && (
                <>
                  <span>{order.garageName}</span>
                  <span>{order.garageLocation}</span>
                  <button 
                    className={`is-surveyor-assigned ${order.isSurveyorAssigned ? 'assigned' : 'not-assigned'}`}
                    onClick={() => toggleSurveyorAssigned(order.id, order.isSurveyorAssigned)}
                  >
                    {order.isSurveyorAssigned ? 'Assigned' : 'Not Assigned'}
                  </button>
                  <button 
                    className="assign-surveyor"
                    onClick={() => handleAssignSurveyor(order.id)}
                    disabled={order.isSurveyorAssigned}
                  >
                    Assign Surveyor
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
