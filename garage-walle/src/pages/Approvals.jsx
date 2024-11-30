import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import '../styles/Approvals.css';
import OnboardingForm from '../components/OnboardingForm';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'approvals'),
      (querySnapshot) => {
        const approvalsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            applicationTime: data.applicationTime,
            appliedFor: data.appliedFor || 'N/A',
            isApproved: data.isApproved || false,
            appliedByUser: data.appliedByUser || 'Unknown',
            location: data.location || null,
            name: data.name || 'N/A',
            phoneNumber: data.phoneNumber || 'N/A',
            address: data.address || 'N/A',
            garageName: data.garageName || 'N/A',
            garageAddress: data.garageAddress || 'N/A',
            ownerName: data.ownerName || 'N/A',
            ownerPhoneNumber: data.ownerPhoneNumber || 'N/A',
          };
        });
        setApprovals(approvalsData);
      },
      (error) => console.error('Error fetching approvals:', error)
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const handleOpenDialog = (approval) => {
    setSelectedApproval(approval);
    setShowDialog(true); // Show the dialog when 3-dot menu is clicked
  };

  const handleConfirmApprove = () => {
    setShowDialog(false);
    setShowForm(true);
  };

  const handleFormSubmit = async () => {
    if (!selectedApproval) return;

    try {
      const approvalRef = doc(db, 'approvals', selectedApproval.id);
      const userRef = doc(db, 'users', selectedApproval.appliedByUser);

      await updateDoc(approvalRef, { isApproved: true });
      await updateDoc(userRef, { isApproved: true, isFlagged: false });

      setShowForm(false);
      alert('Approval successfully updated!');
    } catch (error) {
      console.error('Error updating approval:', error);
      alert('An error occurred while approving the application.');
    }
  };

  return (
    <div className={`approvals-page ${showForm ? 'dimmed' : ''}`}>
      <div className="approvals-title">Approvals</div>
      {approvals.length === 0 ? (
        <p>No approvals available.</p>
      ) : (
        <div className="approvals-table">
          <div className="approvals-header">
            <div className="header-item">Application Time</div>
            <div className="header-item">Name</div>
            <div className="header-item">Phone Number</div>
            <div className="header-item">Type</div>
            <div className="header-item">Location</div>
            <div className="header-item">Is Approved</div>
            <div className="header-item">Actions</div>
          </div>
          <ul className="approvals-list">
            {approvals.map((approval) => (
              <li key={approval.id} className="approval-item">
                <div className="approval-item-cell">{formatDate(approval.applicationTime)}</div>
                <div className="approval-item-cell">
                  {approval.appliedFor === 'Surveyor' ? approval.name : approval.ownerName}
                </div>
                <div className="approval-item-cell">
                  {approval.appliedFor === 'Surveyor' ? approval.phoneNumber : approval.ownerPhoneNumber}
                </div>
                <div className="approval-item-cell">{approval.appliedFor}</div>
                <div className="approval-item-cell">
                  {approval.location
                    ? `Lat: ${approval.location.latitude || 'N/A'}, Lon: ${approval.location.longitude || 'N/A'}`
                    : 'No location'}
                </div>
                <div className="approval-item-cell">{approval.isApproved ? 'Yes' : 'No'}</div>
                <div className="approval-item-cell">
                  <IconButton
                    onClick={() => handleOpenDialog(approval)}
                    aria-label="approve-user"
                    disabled={approval.isApproved}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dialog Box */}
      {showDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <p>Are you sure you want to approve this user?</p>
            <div className="dialog-buttons">
              <button onClick={handleConfirmApprove}>Yes, I want to approve</button>
              <button onClick={() => setShowDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <OnboardingForm
          approval={selectedApproval}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}


