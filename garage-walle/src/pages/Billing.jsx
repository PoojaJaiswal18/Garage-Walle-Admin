import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  TextField,
  Checkbox,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import '../styles/Billing.css';

const BillingPage = () => {
  const [garages, setGarages] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [billDetails, setBillDetails] = useState([]);
  const [totals, setTotals] = useState({
    totalBillAmount: 0, 
    totalPaymentToGarage: 0,
    totalCommission: 0,
    totalPlatformFees: 0,
    totalTaxableCommission: 0,
    totalTaxableVisitCharges: 0,
    totalVisitCharges: 0
  });
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGarage, setSelectedGarage] = useState(null);
  const [selectedSurveyor, setSelectedSurveyor] = useState(null);
  const [selectedTab, setSelectedTab] = useState('garage');

  // Normalize date to ensure correct format
  const normalizeDate = (inputDate) => {
    // Ensure the date is in YYYY-MM-DD format
    const parts = inputDate.split('-');
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert normalized date to Firestore format
  const convertToFirestoreFormat = (normalizedDate) => {
    const [year, month, day] = normalizedDate.split('-');
    return `${parseInt(day)}.${parseInt(month)}.${year}`;
  };

  // Date change handler with proper formatting
  const handleDateChange = (event) => {
    try {
      const inputDate = event.target.value;
      const normalizedDate = normalizeDate(inputDate);
      const firestoreFormattedDate = convertToFirestoreFormat(normalizedDate);
      setSelectedDate(firestoreFormattedDate);
    } catch (error) {
      console.error('Error parsing date:', error);
      setSelectedDate('');
    }
  };

  // Fetch surveyors data
  useEffect(() => {
    const fetchSurveyors = async () => {
      if (selectedTab !== 'surveyor' || !selectedDate) return;
      
      try {
        const surveyorsRef = collection(db, 'surveyors');
        const surveyorsSnapshot = await getDocs(surveyorsRef);
        
        const surveyorsData = [];
        const processSurveyor = async (surveyorDoc) => {
          const surveyorData = surveyorDoc.data();
          const billingRef = collection(db, `surveyors/${surveyorDoc.id}/billing`);
          const billingSnapshot = await getDocs(billingRef);
          
          let settlementAmount = 0;
          let settlementStatus = false;

          billingSnapshot.docs.forEach((billingDoc) => {
            if (billingDoc.id === selectedDate) {
              const orders = billingDoc.data().orders || [];
              settlementAmount = orders.reduce((total, order) => total + (order.billAmount || 0), 0);
              settlementStatus = billingDoc.data().paymentSettled || false;
            }
          });

          if (settlementAmount > 0) {
            surveyorsData.push({
              id: surveyorDoc.id,
              name: surveyorData.name,
              settlementAmount,
              settlementStatus,
            });
          }
        };

        await Promise.all(surveyorsSnapshot.docs.map(processSurveyor));
        setSurveyors(surveyorsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching surveyors:', error);
        setLoading(false);
      }
    };

    fetchSurveyors();
  }, [selectedTab, selectedDate]);

  // Fetch garages data
  useEffect(() => {
    const fetchGarages = async () => {
      if (selectedTab !== 'garage') return;
      
      setLoading(true);
      try {
        const garagesRef = collection(db, 'garages');
        const garagesSnapshot = await getDocs(garagesRef);

        const garagesData = [];
        const processGarage = async (garageDoc) => {
          const garageName = garageDoc.data().name;
          const isPaid = garageDoc.data().isPaid || false;
          const billingRef = collection(db, `garages/${garageDoc.id}/billing`);
          const billingSnapshot = await getDocs(billingRef);

          let totalOrders = 0;
          let totalPaymentToGarage = 0;
          let totalBillAmount = 0;

          billingSnapshot.forEach((billingDoc) => {
            if (selectedDate && billingDoc.id !== selectedDate) return;
            const orders = billingDoc.data().orders || [];

            totalOrders += orders.length;
            orders.forEach((order) => {
              totalBillAmount += order.billAmount || 0;
              totalPaymentToGarage += (order.billAmount || 0) - (order.commission || 0);
            });
          });

          if (totalOrders > 0) {
            garagesData.push({
              id: garageDoc.id,
              garageName,
              totalOrders,
              totalBillAmount,
              totalPaymentToGarage,
              isPaid,
            });
          }
        };

        await Promise.all(garagesSnapshot.docs.map(processGarage));
        setGarages(garagesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching garages:', error);
        setLoading(false);
      }
    };

    fetchGarages();
  }, [selectedTab, selectedDate]);

  // View Details Handler
  const handleViewDetails = (item) => {
    if (selectedTab === 'garage') {
      handleViewGarageBills(item);
    } else {
      handleViewSurveyorBills(item);
    }
  };

  // View Garage Bills
  const handleViewGarageBills = async (garage) => {
    setSelectedGarage(garage);
    try {
      const billingRef = collection(db, `garages/${garage.id}/billing`);
      const billingSnapshot = await getDocs(billingRef);

      let totalBillAmount = 0;
      let totalPaymentToGarage = 0;
      let totalCommission = 0;
      let totalPlatformFees = 0;
      let totalTaxableCommission = 0;
      let totalTaxableVisitCharges = 0;
      let totalVisitCharges = 0;
      const bills = [];

      const processOrders = async (orders) => {
        for (const order of orders) {
          const orderRef = order.orderId;
          const orderSnapshot = await getDoc(orderRef);

          const billAmount = parseFloat(order.billAmount) || 0;
          const commission = parseFloat(order.commission) || 0;
          const paymentToGarage = parseFloat(order.payableToGarage) || 0;
          const platformFees = parseFloat(order.platformFees) || 0;
          const taxableCommission = parseFloat(order.taxableCommission) || 0;
          const taxableVisitCharges = parseFloat(order.taxableVisitCharges) || 0;
          const visitCharges = parseFloat(order.visitCharges) || 0;

          bills.push({
            orderId: orderSnapshot.id,
            billAmount,
            commission,
            paymentToGarage,
            platformFees,
            taxableCommission,
            taxableVisitCharges,
            visitCharges
          });

          totalBillAmount += billAmount;
          totalPaymentToGarage += paymentToGarage;
          totalCommission += commission;
          totalPlatformFees += platformFees;
          totalTaxableCommission += taxableCommission;
          totalTaxableVisitCharges += taxableVisitCharges;
          totalVisitCharges += visitCharges;
        }
      };

      // Fetch all billing documents and process their orders
      for (const doc of billingSnapshot.docs) {
        if (doc.id === selectedDate) {
          await processOrders(doc.data().orders || []);
        }
      }

      setBillDetails(bills);
      setTotals({
        totalBillAmount,
        totalPaymentToGarage,
        totalCommission,
        totalPlatformFees,
        totalTaxableCommission,
        totalTaxableVisitCharges,
        totalVisitCharges
      });
      setOpenDialog(true);
    } catch (error) {
      console.error('Error fetching billing details:', error);
    }
  };

  // Dialog Close Handler (remains the same)
  const handleDialogClose = () => {
    setOpenDialog(false);
    setBillDetails([]);
    setSelectedGarage(null);
    setSelectedSurveyor(null);
  };

  // Settlement Status Change Handler
  const handleSettlementStatusChange = async (id, checked) => {
    try {
      if (selectedTab === 'garage') {
        await updateDoc(doc(db, 'garages', id), { isPaid: checked });
        setGarages(prevGarages =>
          prevGarages.map(garage =>
            garage.id === id ? { ...garage, isPaid: checked } : garage
          )
        );
      } else {
        await updateDoc(doc(db, `surveyors/${id}/billing/${selectedDate}`), {
          paymentSettled: checked 
        });
        setSurveyors(prevSurveyors =>
          prevSurveyors.map(surveyor =>
            surveyor.id === id ? { ...surveyor, settlementStatus: checked } : surveyor
          )
        );
      }
    } catch (error) {
      console.error('Error updating settlement status:', error);
    }
  };

  // Tab Change Handler
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setBillDetails([]);
    setSelectedGarage(null);
    setSelectedSurveyor(null);
    setOpenDialog(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="billing-page">
      <h1>Billing</h1>

      <div className="settlement-buttons">
        <Button
          variant={selectedTab === 'garage' ? 'contained' : 'outlined'}
          onClick={() => handleTabChange('garage')}
        >
          Garage Settlement
        </Button>
        <Button
          variant={selectedTab === 'surveyor' ? 'contained' : 'outlined'}
          onClick={() => handleTabChange('surveyor')}
        >
          Surveyor Settlement
        </Button>
      </div>

      <TextField
        label="Select Date"
        type="date"
        onChange={handleDateChange}
        InputLabelProps={{ shrink: true }}
        inputProps={{ 
          max: new Date().toISOString().split('T')[0],
          // Ensure input accepts YYYY-MM-DD format
          pattern: "\\d{4}-\\d{2}-\\d{2}"
        }}
        value={
          selectedDate
            ? (() => {
                const [day, month, year] = selectedDate.split('.');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              })()
            : ''
        }
      />

{selectedTab === 'garage' ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Garage Name</TableCell>
              <TableCell>Total Orders</TableCell>
              <TableCell>Total Bill Amount (Rs.)</TableCell>
              <TableCell>Payment to Garage (Rs.)</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {garages.length > 0 ? (
              garages.map((garage) => (
                <TableRow key={garage.id}>
                  <TableCell>{garage.garageName}</TableCell>
                  <TableCell>{garage.totalOrders}</TableCell>
                  <TableCell>{garage.totalBillAmount.toFixed(2)}</TableCell>
                  <TableCell>{garage.totalPaymentToGarage.toFixed(2)}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={garage.isPaid}
                      onChange={(e) => handleSettlementStatusChange(garage.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleViewDetails(garage)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>No data found for the selected date.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Surveyor Name</TableCell>
              <TableCell>Settlement Amount</TableCell>
              <TableCell>Settlement Status</TableCell>
              <TableCell>Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {surveyors.length > 0 ? (
              surveyors.map((surveyor) => (
                <TableRow key={surveyor.id}>
                  <TableCell>{surveyor.name}</TableCell>
                  <TableCell>{surveyor.settlementAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={surveyor.settlementStatus}
                      onChange={(e) => handleSettlementStatusChange(surveyor.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleViewDetails(surveyor)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>No data found for the selected date.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

<Dialog open={openDialog} onClose={handleDialogClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Settlement Details
        <IconButton
          onClick={handleDialogClose}
          style={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sr. No.</TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell>Bill Amount (Rs.)</TableCell>
              <TableCell>Commission (Rs.)</TableCell>
              <TableCell>Payable To Garage (Rs.)</TableCell>
              <TableCell>Platform Fees (Rs.)</TableCell>
              <TableCell>Taxable Commission (Rs.)</TableCell>
              <TableCell>Taxable Visit Charges (Rs.)</TableCell>
              <TableCell>Visit Charges (Rs.)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billDetails.map((bill, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{bill.orderId}</TableCell>
                <TableCell>{bill.billAmount.toFixed(2)}</TableCell>
                <TableCell>{bill.commission.toFixed(2)}</TableCell>
                <TableCell>{bill.paymentToGarage.toFixed(2)}</TableCell>
                <TableCell>{bill.platformFees.toFixed(2)}</TableCell>
                <TableCell>{bill.taxableCommission.toFixed(2)}</TableCell>
                <TableCell>{bill.taxableVisitCharges.toFixed(2)}</TableCell>
                <TableCell>{bill.visitCharges.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2}><strong>Total</strong></TableCell>
              <TableCell><strong>{totals.totalBillAmount.toFixed(2)}</strong></TableCell>
              <TableCell><strong>{totals.totalCommission.toFixed(2)}</strong></TableCell>
              <TableCell><strong>{totals.totalPaymentToGarage.toFixed(2)}</strong></TableCell>
              <TableCell><strong>{totals.totalPlatformFees.toFixed(2)}</strong></TableCell>
              <TableCell><strong>{totals.totalTaxableCommission.toFixed(2)}</strong></TableCell>
              <TableCell><strong>{totals.totalTaxableVisitCharges.toFixed(2)}</strong></TableCell>
              <TableCell><strong>{totals.totalVisitCharges.toFixed(2)}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
    </div>
  );
};

export default BillingPage;