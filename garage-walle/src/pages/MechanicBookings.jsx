import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate } from 'react-router-dom';
import '../styles/MechanicBookings.css';

const MechanicBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'mechanicBookings'), (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBookings(bookingsData);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (booking) => {
    setSelectedBooking(booking);
    setOpenDialog(true);
    handleCloseMenu();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBooking(null);
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const confirmAssignment = () => {
    handleCloseDialog();
    if (selectedBooking) {
      navigate('/mechanic-list', { state: { bookingLocation: selectedBooking.bookingLocation, bookingId: selectedBooking.id } });
    }
  };

  const formatGeoPoint = (geoPoint) => `Lat: ${geoPoint.latitude}, Lng: ${geoPoint.longitude}`;

  return (
    <div className="mechanic-bookings">
      <h1>Mechanic Bookings</h1>
      {bookings.length === 0 ? (
        <p>No mechanic bookings available.</p>
      ) : (
        <div className="bookings-table">
          <div className="bookings-header">
            <div className="header-item">Customer Name</div>
            <div className="header-item">Customer Location</div>
            <div className="header-item">Type</div>
            <div className="header-item">Assigning Status</div>
            <div className="header-item">Actions</div>
          </div>
          <ul className="bookings-list">
            {bookings.map((booking) => (
              <li key={booking.id} className="booking-item">
                <div className="booking-item-cell">{booking.bookedBy}</div>
                <div className="booking-item-cell">{formatGeoPoint(booking.bookingLocation)}</div>
                <div className="booking-item-cell">Mechanic</div>
                <div className="booking-item-cell">
                  <button className={`assignment-status ${booking.isMechanicAssigned ? 'assigned' : 'not-assigned'}`}>
                    {booking.isMechanicAssigned ? 'Assigned' : 'Not Assigned'}
                  </button>
                </div>
                <div className="booking-item-cell">
                  <IconButton onClick={handleOpenMenu}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
                    <MenuItem onClick={() => handleOpenDialog(booking)}>
                      Assign Mechanic
                    </MenuItem>
                  </Menu>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Assign Mechanic</DialogTitle>
        <DialogContent>Are you sure you want to assign a mechanic?</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={confirmAssignment} color="primary">Yes, Assign</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MechanicBookings;
