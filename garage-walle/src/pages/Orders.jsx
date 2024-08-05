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
            <div className="header-item">Assign Surveyor</div> {/* Empty for alignment */}
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
                        onClick={() => toggleSurveyorAssigned(order.id, order.isSurveyorAssigned)}
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
