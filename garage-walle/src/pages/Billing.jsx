import React, { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
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
  CircularProgress,
  Typography,
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
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSettlementDialog, setOpenSettlementDialog] = useState(false);
  const [selectedGarage, setSelectedGarage] = useState(null);
  const [selectedSurveyor, setSelectedSurveyor] = useState(null);
  const [selectedTab, setSelectedTab] = useState('garage');
  const [error, setError] = useState(null);
  const [settlementDetails, setSettlementDetails] = useState([]);
  const [settlementTotals, setSettlementTotals] = useState({
    totalBillAmount: 0,
    totalCommission: 0,
    totalPayableToGarage: 0,
    totalPlatformFees: 0,
    totalTaxableCommission: 0,
    totalTaxableVisitCharges: 0,
    totalVisitCharges: 0
  });

  // Normalize date to ensure correct format
  const normalizeDate = useCallback((inputDate) => {
    if (!inputDate) return '';
    const parts = inputDate.split('-');
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Convert normalized date to Firestore format
  const convertToFirestoreFormat = useCallback((normalizedDate) => {
    if (!normalizedDate) return '';
    const [year, month, day] = normalizedDate.split('-');
    return `${parseInt(day)}.${parseInt(month)}.${year}`;
  }, []);

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
      setError('Invalid date format');
    }
  };

  // Fetch surveyors data
  useEffect(() => {
    const fetchSurveyors = async () => {
      if (selectedTab !== 'surveyor' || !selectedDate) return;
      
      setLoading(true);
      setError(null);
      try {
        const surveyorsRef = collection(db, 'surveyors');
        const surveyorsSnapshot = await getDocs(surveyorsRef);
        
        const surveyorsData = [];
        for (const surveyorDoc of surveyorsSnapshot.docs) {
          const surveyorData = surveyorDoc.data();
          const billingRef = collection(db, `surveyors/${surveyorDoc.id}/billing`);
          const billingSnapshot = await getDocs(billingRef);
          
          let settlementAmount = 0;
          let settlementStatus = false;

          billingSnapshot.docs.forEach((billingDoc) => {
            if (billingDoc.id === selectedDate) {
              const orders = billingDoc.data()?.orders || [];
              settlementAmount = orders.reduce((total, order) => total + (order.billAmount || 0), 0);
              settlementStatus = billingDoc.data()?.paymentSettled || false;
            }
          });

          if (settlementAmount > 0) {
            surveyorsData.push({
              id: surveyorDoc.id,
              name: surveyorData.name || 'Unknown Surveyor',
              settlementAmount,
              settlementStatus,
            });
          }
        }

        setSurveyors(surveyorsData);
      } catch (error) {
        console.error('Error fetching surveyors:', error);
        setError('Failed to fetch surveyors');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyors();
  }, [selectedTab, selectedDate, convertToFirestoreFormat]);

  // Fetch garages data
    // New method to fetch settlement details
    const fetchSettlementDetails = async (garage) => {
      try {
        const billingRef = collection(db, `garages/${garage.id}/billing`);
        const billingSnapshot = await getDocs(billingRef);
  
        const settlements = [];
        const totals = {
          totalBillAmount: 0,
          totalCommission: 0,
          totalPayableToGarage: 0,
          totalPlatformFees: 0,
          totalTaxableCommission: 0,
          totalTaxableVisitCharges: 0,
          totalVisitCharges: 0
        };
  
        for (const doc of billingSnapshot.docs) {
          if (doc.id === selectedDate) {
            const orders = doc.data()?.orders || [];
            orders.forEach((order, index) => {
              const settlement = {
                srNo: index + 1,
                orderId: order.orderId || 'N/A',
                billAmount: parseFloat(order.billAmount) || 0,
                commission: parseFloat(order.commission) || 0,
                payableToGarage: parseFloat(order.payableToGarage) || 0,
                platformFees: parseFloat(order.platformFees) || 0,
                taxableCommission: parseFloat(order.taxableCommission) || 0,
                taxableVisitCharges: parseFloat(order.taxableVisitCharges) || 0,
                visitCharges: parseFloat(order.visitCharges) || 0
              };
  
              settlements.push(settlement);
  
              // Calculate totals
              totals.totalBillAmount += settlement.billAmount;
              totals.totalCommission += settlement.commission;
              totals.totalPayableToGarage += settlement.payableToGarage;
              totals.totalPlatformFees += settlement.platformFees;
              totals.totalTaxableCommission += settlement.taxableCommission;
              totals.totalTaxableVisitCharges += settlement.taxableVisitCharges;
              totals.totalVisitCharges += settlement.visitCharges;
            });
          }
        }
  
        setSettlementDetails(settlements);
        setSettlementTotals(totals);
        setOpenSettlementDialog(true);
      } catch (error) {
        console.error('Error fetching settlement details:', error);
        setError('Failed to fetch settlement details');
      }
    };
  
    // Modify existing handleViewDetails method
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

      for (const doc of billingSnapshot.docs) {
        if (doc.id === selectedDate) {
          const orders = doc.data()?.orders || [];
          for (const order of orders) {
            const billAmount = parseFloat(order.billAmount) || 0;
            const commission = parseFloat(order.commission) || 0;
            const paymentToGarage = parseFloat(order.payableToGarage) || 0;
            const platformFees = parseFloat(order.platformFees) || 0;
            const taxableCommission = parseFloat(order.taxableCommission) || 0;
            const taxableVisitCharges = parseFloat(order.taxableVisitCharges) || 0;
            const visitCharges = parseFloat(order.visitCharges) || 0;

            bills.push({
              orderId: order.orderId || 'N/A',
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
      setError('Failed to fetch billing details');
    }
  };

  // Dialog Close Handlers
  const handleDialogClose = () => {
    setOpenDialog(false);
    setBillDetails([]);
    setSelectedGarage(null);
    setSelectedSurveyor(null);
  };

  const handleSettlementDialogClose = () => {
    setOpenSettlementDialog(false);
    setSettlementDetails([]);
    setSelectedGarage(null);
  };
  // Settlement Status Change Handler
  const handleSettlementStatusChange = async (item) => {
    try {
      if (selectedTab === 'garage') {
        const billingRef = doc(db, `garages/${item.id}/billing/${selectedDate}`);
        await updateDoc(billingRef, { isPaid: true });
        
        setGarages(prevGarages =>
          prevGarages.map(garage =>
            garage.id === item.id ? { ...garage, isPaid: true } : garage
          )
        );
      } else {
        await updateDoc(doc(db, `surveyors/${item.id}/billing/${selectedDate}`), {
          paymentSettled: true 
        });
        setSurveyors(prevSurveyors =>
          prevSurveyors.map(surveyor =>
            surveyor.id === item.id ? { ...surveyor, settlementStatus: true } : surveyor
          )
        );
      }
    } catch (error) {
      console.error('Error updating settlement status:', error);
      setError('Failed to update settlement status');
    }
  };

  // Tab Change Handler
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setBillDetails([]);
    setSelectedGarage(null);
    setSelectedSurveyor(null);
    setOpenDialog(false);
    setSelectedDate('');
    setError(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="billing-page-loading">
        <CircularProgress />
        <Typography variant="body1">Loading...</Typography>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="billing-page-error">
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <Button onClick={() => setError(null)}>Retry</Button>
      </div>
    );
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
        fullWidth
        margin="normal"
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
              garages.map((garage, index) => (
                <TableRow key={`${garage.id || 'unknown'}-${index}`}>
        <TableCell>{garage.garageName}</TableCell>
        <TableCell>{garage.totalOrders}</TableCell>
        <TableCell>{garage.totalBillAmount.toFixed(2)}</TableCell>
        <TableCell>{garage.totalPaymentToGarage.toFixed(2)}</TableCell>
        <TableCell>
        <Button 
                      variant="outlined" 
                      onClick={() => fetchSettlementDetails(garage)}
                    >
                      View Settlement Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No data found for the selected date.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) :  (
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
    surveyors.map((surveyor, index) => (
      <TableRow key={`${surveyor.id || 'unknown'}-${index}`}>
        <TableCell>{surveyor.name}</TableCell>
        <TableCell>{surveyor.settlementAmount.toFixed(2)}</TableCell>
        <TableCell>
          <Button
            variant={surveyor.settlementStatus ? 'contained' : 'outlined'}
            color={surveyor.settlementStatus ? 'success' : 'primary'}
            onClick={() => !surveyor.settlementStatus && handleSettlementStatusChange(surveyor)}
            disabled={surveyor.settlementStatus}
          >
            {surveyor.settlementStatus ? 'Paid' : 'Mark as Paid'}
          </Button>
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
      <TableCell colSpan={4} align="center">
        No data found for the selected date.
      </TableCell>
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
    <TableRow key={`${bill.orderId || 'unknown'}-${index}`}>
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
  <TableRow key="total-row">
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