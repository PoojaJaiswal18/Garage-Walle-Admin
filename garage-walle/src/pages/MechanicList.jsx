import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import '../styles/MechanicList.css';

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MechanicList = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [mechanics, setMechanics] = useState([]);
  const [sortedMechanics, setSortedMechanics] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [error, setError] = useState(null);

  const bookingLocation = state?.bookingLocation;

  useEffect(() => {
    // Fetch mechanics data
    const unsubscribeMechanics = onSnapshot(collection(db, 'mechanics'), (querySnapshot) => {
      const mechanicsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data };
      });

      setMechanics(mechanicsData);
    });

    return () => unsubscribeMechanics();
  }, []);

  useEffect(() => {
    // Sort mechanics when bookingLocation or mechanics change
    if (bookingLocation && mechanics.length > 0) {
      const mechanicsWithDistances = mechanics.map((mechanic) => {
        const { location } = mechanic;
        const distance = location
          ? getDistanceFromLatLonInKm(
              bookingLocation.latitude,
              bookingLocation.longitude,
              location.latitude,
              location.longitude
            )
          : null;
        return { ...mechanic, distance };
      });

      mechanicsWithDistances.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      setSortedMechanics(mechanicsWithDistances);
    } else {
      setSortedMechanics(mechanics);
    }
  }, [bookingLocation, mechanics]);

  const handleAssignMechanic = async () => {
    if (!selectedMechanic || !state?.bookingId) {
      console.error("Missing required data for assignment");
      return;
    }

    try {
      const bookingRef = doc(db, 'mechanicBookings', state.bookingId);
      await updateDoc(bookingRef, {
        isMechanicAssigned: true,
        assignedMechanicId: selectedMechanic.id,
        assignedMechanicName: selectedMechanic.name,
        assignedMechanicLocation: selectedMechanic.location,
        assignmentTimestamp: new Date().toISOString(),
        assignedDistance: selectedMechanic.distance
      });

      setOpenDialog(false);
      navigate('/mechanic-bookings');
    } catch (err) {
      setError("Failed to assign mechanic");
    }
  };

  return (
    <div className="mechanic-list">
      <h2>Mechanic List {bookingLocation ? '(Sorted by Distance)' : ''}</h2>
      {sortedMechanics.length === 0 ? (
        <div>No mechanics available</div>
      ) : (
        <>
          <div className="mechanic-header">
            <span className="header-item">Name</span>
            <span className="header-item">Phone Number</span>
            <span className="header-item">Location</span>
            {bookingLocation && <span className="header-item">Distance (km)</span>}
            {bookingLocation && <span className="header-item">Action</span>}
          </div>
          <ul>
            {sortedMechanics.map((mechanic) => (
              <li key={mechanic.id} className="mechanic-item">
                <span>{mechanic.name || 'N/A'}</span>
                <span>{mechanic.phoneNumber || 'N/A'}</span>
                <span>
                  {mechanic.location
                    ? `Lat: ${mechanic.location.latitude.toFixed(4)}, Lng: ${mechanic.location.longitude.toFixed(4)}`
                    : 'Location not available'}
                </span>
                {bookingLocation && (
                  <span>
                    {mechanic.distance
                      ? `${mechanic.distance.toFixed(2)} km`
                      : 'N/A'}
                  </span>
                )}
                {bookingLocation && (
                  <span>
                    <IconButton
                      onClick={() => {
                        setSelectedMechanic(mechanic);
                        setOpenDialog(true);
                      }}
                      disabled={!mechanic.location}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>Confirm Assignment</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to assign {selectedMechanic?.name} to this booking?</p>
          {selectedMechanic?.distance && (
            <p>Distance from customer: {selectedMechanic.distance.toFixed(2)} km</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAssignMechanic}
            color="primary"
            disabled={!selectedMechanic}
          >
            Yes, Assign
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MechanicList;

