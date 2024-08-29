import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import '../styles/Approvals.css';
import OnboardingForm from '../components/OnboardingForm';

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'approvals'), (querySnapshot) => {
      const approvalsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const approval = {
          id: doc.id,
          applicationTime: data.applicationTime,
          appliedFor: data.appliedFor,
          isApproved: data.isApproved,
          appliedByUser: data.appliedByUser,
        };

        if (data.appliedFor === 'Surveyor') {
          approval.name = data.name;
          approval.phoneNumber = data.phoneNumber;
          approval.address = data.address;
          approval.location = data.location;
        } else if (data.appliedFor === 'Garage') {
          approval.garageName = data.garageName;
          approval.garageAddress = data.garageAddress;
          approval.ownerName = data.ownerName;
          approval.ownerPhoneNumber = data.ownerPhoneNumber;
          approval.location = data.location;
        }

        return approval;
      });

      setApprovals(approvalsData);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = (approval) => {
    setSelectedApproval(approval);
    setShowForm(true);
  };

  const handleFormSubmit = async () => {
    if (!selectedApproval) return;

    const approvalRef = doc(db, 'approvals', selectedApproval.id);
    const userRef = doc(db, 'users', selectedApproval.appliedByUser);

    await updateDoc(approvalRef, { isApproved: true });

    await updateDoc(userRef, {
      isApproved: true,
      isFlagged: false,
    });

    setShowForm(false);
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
            <div className="header-item">Approve</div>
          </div>
          <ul className="approvals-list">
            {approvals.map((approval) => (
              <li key={approval.id} className="approval-item">
                <div className="approval-item-cell">
                  {new Date(approval.applicationTime.seconds * 1000).toLocaleString()}
                </div>
                <div className="approval-item-cell">
                  {approval.appliedFor === 'Surveyor' ? approval.name : approval.ownerName}
                </div>
                <div className="approval-item-cell">
                  {approval.appliedFor === 'Surveyor' ? approval.phoneNumber : approval.ownerPhoneNumber}
                </div>
                <div className="approval-item-cell">{approval.appliedFor}</div>
                <div className="approval-item-cell">
                  {`Lat: ${approval.location.latitude}, Lon: ${approval.location.longitude}`}
                </div>
                <div className="approval-item-cell">{approval.isApproved ? 'Yes' : 'No'}</div>
                <div className="approval-item-cell">
                  <button
                    onClick={() => handleApprove(approval)}
                    disabled={approval.isApproved}
                    className="approve-button"
                  >
                    Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
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

