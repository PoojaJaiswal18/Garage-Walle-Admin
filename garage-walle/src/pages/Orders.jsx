import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
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

  const toggleSurveyorAssigned = async (orderId, isAssigned, surveyorId) => {
    try {
      const orderDoc = doc(db, 'orders', orderId);
      const surveyorDoc = doc(db, 'surveyors', surveyorId);

      if (isAssigned) {
        // Remove surveyor assignment
        await updateDoc(orderDoc, {
          isSurveyorAssigned: false,
          surveyorId: deleteField() // Remove surveyorId field
        });
        await updateDoc(surveyorDoc, {
          orderId: deleteField() // Remove orderId field
        });
      } else {
        // Assign a surveyor
        await updateDoc(orderDoc, {
          isSurveyorAssigned: true,
          surveyorId
        });
        await updateDoc(surveyorDoc, {
          orderId
        });
      }

      // Update local state
      setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, isSurveyorAssigned: !isAssigned } : order
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
                <div className="order-item-cell">{order.orderId}</div>
                <div className="order-item-cell">{order.Tag}</div>
                {order.Tag === 'garage' && (
                  <>
                    <div className="order-item-cell">{order.garageName}</div>
                    <div className="order-item-cell">{order.garageLocation.latitude}, {order.garageLocation.longitude}</div>
                    <div className="order-item-cell">
                      <button 
                        className={`is-surveyor-assigned ${order.isSurveyorAssigned ? 'assigned' : 'not-assigned'}`}
                        onClick={() => toggleSurveyorAssigned(order.id, order.isSurveyorAssigned, order.surveyorId)}
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
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
