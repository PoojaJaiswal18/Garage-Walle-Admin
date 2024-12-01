import React, { useEffect, useState } from 'react'; 
import { getFirestore, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore'; 
import { FaEllipsisV, FaPlus, FaTimes } from 'react-icons/fa'; 
import '../styles/BillApproval.css'; 
import { toast } from 'react-toastify'; 
 
export default function BillApproval() { 
  const [bills, setBills] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [services, setServices] = useState([
    { service: '', amount: '' }
  ]);
  const [platformFee, setPlatformFee] = useState(1);
  const [visitCharges, setVisitCharges] = useState(69);
  const db = getFirestore(); 

  
  const serviceOptions = [
    "General Services", 
    "Standard Service", 
    "Comprehensive Check Up",
    "Visit Charges", 
    "Visit Charge", 
    "Towing Charge",
    "Brake Shoe Replacement",
    "Brake Pad/ Disk Pad Replacement", 
    "Chain & sprocket kit Replacement",
    "Clutch plate assy Replacement",
    "Accelerator Cable Replacement",
    "Wiring Harness Troubleshooting", 
    "Lock Assy Or Ignition Key Assy Replacement",
    "Wiring Harness Replacement",
    "Engine Overhauling",
    "Any Cable Replacement", 
    "Front Shockup Repairing",
    "BS6 Dignose"
  ];

  
  useEffect(() => { 
    const fetchBills = async () => { 
      try {
        const adminDocRef = doc(db, 'admin', 'billRaised'); 
        const adminDocSnap = await getDoc(adminDocRef); 
 
        if (adminDocSnap.exists()) { 
          const billsData = adminDocSnap.data()?.bills || []; 
          
          const enrichedBills = await Promise.all( 
            billsData.map(async (bill) => { 
              try {
              
                const bookingRefPath = bill.bookingRef.path;
                const bookingSnap = await getDoc(doc(db, bookingRefPath)); 
                
                if (!bookingSnap.exists()) {
                  console.error('Booking document does not exist');
                  return null;
                }
                
                const bookingData = bookingSnap.data(); 
 
                const garagePath = bookingRefPath.split('/').slice(0, 2).join('/');
                const garageSnap = await getDoc(doc(db, garagePath)); 
                
                if (!garageSnap.exists()) {
                  console.error('Garage document does not exist');
                  return null;
                }
                
                const garageData = garageSnap.data(); 
 
                return { 
                  bookingRef: bill.bookingRef, 
                  customerName: bookingData?.bookedBy || 'Unknown', 
                  address: bookingData?.bookingLocationAddress || 'No Address', 
                  garageName: garageData?.name || 'Unknown Garage', 
                  image: bill.image, 
                }; 
              } catch (billError) {
                console.error('Error processing individual bill:', billError);
                return null;
              }
            }) 
          ); 
 
          setBills(enrichedBills.filter(bill => bill !== null));
          setLoading(false);
        } else {
          console.error('No such document!');
          setLoading(false);
        }
      } catch (fetchError) {
        console.error('Error fetching bills:', fetchError);
        setError(fetchError);
        setLoading(false);
      }
    }; 
 
    fetchBills(); 
  }, [db]); 

 
  const handleServiceChange = (index, field, value) => {
    const newServices = [...services];
    newServices[index][field] = value;
    setServices(newServices);
  };

  
  const addServiceRow = () => {
    setServices([...services, { service: '', amount: '' }]);
  };


  const removeServiceRow = (index) => {
    const newServices = services.filter((_, i) => i !== index);
    setServices(newServices);
  };

  
  const filterServices = (input, index) => {
    return serviceOptions.filter(service => 
      service.toLowerCase().includes(input.toLowerCase())
    );
  };

  
  const handleSubmitBill = async (e) => {
    e.preventDefault();
  
    // Validate services
    const validServices = services.filter(
      service => service.service.trim() !== '' && service.amount.trim() !== ''
    );
  
    if (validServices.length === 0) {
      toast.error('Please add at least one service');
      return;
    }
  
    try {
      const bookingRefPath = selectedBill.bookingRef.path;
  
      // Calculate total amounts
      const totalServiceAmount = validServices.reduce(
        (total, service) => total + parseFloat(service.amount), 0
      );
      const totalBillAmount = totalServiceAmount + platformFee + visitCharges;
  
      // Create services array
      const billArray = validServices.map(service => ({
        name: service.service,
        cost: parseFloat(service.amount)
      }));
  
      // Create additional charges array
      const additionalCharges = [
        {
          name: "Platform Fees",
          amount: platformFee
        },
        {
          name: "Visit Charges", 
          amount: visitCharges
        }
      ];
  
      // Update booking document
      const bookingDocRef = doc(db, bookingRefPath);
      await updateDoc(bookingDocRef, {
        bill: billArray, // Changed from Bill to bill
        additionalCharges: additionalCharges, // Added additional charges
        billApproved: true,
        billRaised: true,
        billAmount: totalBillAmount
      });
  
      // Remove the bill from admin's billRaised collection
      const adminDocRef = doc(db, 'admin', 'billRaised');
      await updateDoc(adminDocRef, {
        bills: arrayRemove({
          bookingRef: selectedBill.bookingRef,
          image: selectedBill.image
        })
      });
  
      // Update the local state to remove the processed bill
      setBills(prevBills => prevBills.filter(bill => 
        bill.bookingRef.path !== bookingRefPath
      ));
      
      toast.success('Bill submitted successfully!');
      closeModal();
    } catch (error) {
      console.error('Error submitting bill:', error);
      toast.error('Failed to submit bill. Please try again.');
    }
  };
     

  
  const handleApproveClick = (bill) => {
    setSelectedBill(bill);
  };

 
  const closeModal = () => {
    setSelectedBill(null);
    setServices([{ service: '', amount: '' }]);
    setPlatformFee(1);
    setVisitCharges(69);
  };

  if (loading) {
    return <div>Loading bills...</div>;
  }

  if (error) {
    return <div>Error loading bills: {error.message}</div>;
  }
 
  return ( 
    <div className="bill-approval-page"> 
      <h1 className="bill-approval-title">Bill Approval</h1> 
      <div className="bill-approval-container"> 
        <div className="bill-approval-header">
          <div className="header-item">Customer Name</div>
          <div className="header-item">Address</div>
          <div className="header-item">Garage Name</div>
          <div className="header-item">Approve</div>
        </div>
        {bills.map((bill, index) => ( 
          <div key={index} className="bill-approval-row"> 
            <div className="bill-approval-cell">{bill.customerName}</div>
            <div className="bill-approval-cell">{bill.address}</div>
            <div className="bill-approval-cell">{bill.garageName}</div>
            <div className="bill-approval-cell action-menu">
              <button 
                className="approve-button"
                onClick={() => handleApproveClick(bill)}
              > 
                <FaEllipsisV /> 
              </button> 
            </div>
          </div>
        ))} 
      </div>

      {/* Bill Approval Modal */}
      {selectedBill && (
        <div className="bill-approval-modal">
          <div className="bill-approval-modal-content">
            <button 
              className="modal-close-button" 
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <div className="modal-layout">
              {/* Image Section */}
              <div className="modal-image-section">
                <img 
                  src={selectedBill.image} 
                  alt="Bill Reference" 
                  className="bill-reference-image"
                />
              </div>

              {/* Form Section */}
              <div className="modal-form-section">
                <form onSubmit={handleSubmitBill}>
                  {services.map((serviceItem, index) => (
                    <div key={index} className="service-row">
                      <div className="service-input-group">
                        <input 
                          type="text" 
                          placeholder="Enter Service"
                          value={serviceItem.service}
                          onChange={(e) => handleServiceChange(index, 'service', e.target.value)}
                          list={`service-options-${index}`}
                          required
                        />
                        <datalist id={`service-options-${index}`}>
                          {filterServices(serviceItem.service, index).map((option, optIndex) => (
                            <option key={optIndex} value={option} />
                          ))}
                        </datalist>
                        <input 
                          type="number" 
                          placeholder="Amount"
                          value={serviceItem.amount}
                          onChange={(e) => handleServiceChange(index, 'amount', e.target.value)}
                          required
                          min="0"
                        />
                        {index > 0 && (
                          <button 
                            type="button" 
                            onClick={() => removeServiceRow(index)}
                            className="remove-service-btn"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addServiceRow} 
                    className="add-service-btn"
                  >
                    <FaPlus /> Add Service
                  </button>

                  {/* Static Fee Fields */}
                  <div className="static-fee-section">
                    <div className="static-fee-row">
                      <label>Platform Fees:</label>
                      <input 
                        type="number" 
                        value={platformFee}
                        onChange={(e) => setPlatformFee(parseFloat(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div className="static-fee-row">
                      <label>Visit Charges:</label>
                      <input 
                        type="number" 
                        value={visitCharges}
                        onChange={(e) => setVisitCharges(parseFloat(e.target.value))}
                        min="0"
                      />
                    </div>
                  </div>

                  <button type="submit" className="submit-bill-btn">
                    Submit Bill
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div> 
  );
}