import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  getDoc, 
  updateDoc, 
  arrayRemove 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../styles/Orders.css';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, IconButton } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Reference to the admin/bookings document
    const adminBookingsRef = doc(db, 'admin', 'bookings');

    // Listen for changes in the currentBookings array
    const unsubscribe = onSnapshot(adminBookingsRef, async (adminBookingsDoc) => {
      try {
        const currentBookings = adminBookingsDoc.data()?.currentBookings || [];

        // Fetch details for each booking reference
        const bookingsPromises = currentBookings.map(async (bookingRef) => {
          try {
            // Safely get the booking document
            const bookingDoc = await getDoc(bookingRef);
            
            if (bookingDoc.exists()) {
              const bookingData = bookingDoc.data();
              
              // Extract garage ID from the booking reference
              const garageId = bookingRef.parent.parent.id;

              // Fetch associated garage details
              const garageRef = doc(db, 'garages', garageId);
              const garageDoc = await getDoc(garageRef);
              const garageData = garageDoc.exists() ? garageDoc.data() : {};

              return {
                id: bookingDoc.id,
                ...bookingData,
                garageName: garageData.name || 'Unknown Garage',
                garageLocation: garageData.location || {},
                garageId: garageId,
                customerName: bookingData.bookedBy || 'Unknown Customer',
                customerAddress: bookingData.bookingLocationAddress || 'No Address',
                originalRef: bookingRef
              };
            }
            return null;
          } catch (bookingError) {
            console.error('Error processing individual booking:', bookingError);
            return null;
          }
        });

        // Resolve all promises and filter out any null values
        const bookingsData = (await Promise.all(bookingsPromises)).filter(booking => booking !== null);

        // Update orders state
        setOrders(bookingsData);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setOrders([]);
      }
    }, (error) => {
      console.error('Snapshot error:', error);
      setOrders([]);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleAssignSurveyor = async () => {
    if (selectedOrder) {
      // Navigate to surveyors page
      navigate(`/surveyors?orderId=${selectedOrder.id}&garageId=${selectedOrder.garageId}`);

      // Reference to the admin/bookings document
      const adminBookingsRef = doc(db, 'admin', 'bookings');
      
      try {
        // Remove the booking reference from currentBookings
        await updateDoc(adminBookingsRef, {
          currentBookings: arrayRemove(selectedOrder.originalRef)
        });

        // Update the booking to mark surveyor as assigned
        const bookingRef = selectedOrder.originalRef;
        await updateDoc(bookingRef, {
          isSurveyorAssigned: true
        });
      } catch (error) {
        console.error("Error updating booking:", error);
      }
    }
    handleCloseDialog();
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
            <div className="header-item">Assign Surveyor</div>
          </div>
          <ul className="orders-list">
            {orders.map(order => (
              <li key={order.id} className="order-item">
                <div className="order-item-cell">{order.customerName}</div>
                <div className="order-item-cell">{order.customerAddress}</div>
                <div className="order-item-cell">{order.garageName}</div>
                <div className="order-item-cell">
                  {order.garageLocation?.latitude || 'N/A'}, {order.garageLocation?.longitude || 'N/A'}
                </div>
                <div className="order-item-cell">
                  <IconButton onClick={() => handleOpenDialog(order)} aria-label="assign-surveyor">
                    <MoreVertIcon />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Assignment</DialogTitle>
        <DialogContent>
          Are you sure you want to assign a surveyor for this booking?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAssignSurveyor} color="primary">
            Yes, Assign
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  ); 
}