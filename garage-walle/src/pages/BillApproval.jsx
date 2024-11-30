import React, { useEffect, useState } from 'react'; 
import { getFirestore, doc, getDoc } from 'firebase/firestore'; 
import { FaEllipsisV } from 'react-icons/fa'; 
import '../styles/BillApproval.css'; 
 
export default function BillApproval() { 
  const [bills, setBills] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const db = getFirestore(); 
 
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
                // Correctly parse the firebase reference
                const bookingRefPath = bill.bookingRef.path;
                const bookingSnap = await getDoc(doc(db, bookingRefPath)); 
                
                if (!bookingSnap.exists()) {
                  console.error('Booking document does not exist');
                  return null;
                }
                
                const bookingData = bookingSnap.data(); 
 
                // Extract garage path from booking reference
                const garagePath = bookingRefPath.split('/').slice(0, 2).join('/');
                const garageSnap = await getDoc(doc(db, garagePath)); 
                
                if (!garageSnap.exists()) {
                  console.error('Garage document does not exist');
                  return null;
                }
                
                const garageData = garageSnap.data(); 
 
                return { 
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
 
          // Filter out any null results
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
              <button className="approve-button"> 
                <FaEllipsisV /> 
              </button> 
            </div>
          </div>
        ))} 
      </div>
    </div> 
  ); 
}