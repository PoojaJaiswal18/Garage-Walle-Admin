import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Ensure Firebase is correctly configured
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
  const [selectedDate, setSelectedDate] = useState('');
  const [billDetails, setBillDetails] = useState([]);
  const [totals, setTotals] = useState({ totalBillAmount: 0, totalPaymentToGarage: 0 });
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGarage, setSelectedGarage] = useState(null);

  // Fetch garages and calculate totals for each one
  useEffect(() => {
    const fetchGarages = async () => {
      setLoading(true);
      try {
        const garagesRef = collection(db, 'garages');
        const garagesSnapshot = await getDocs(garagesRef);

        const garagesData = [];
        const processGarage = async (garageDoc) => {
          const garageName = garageDoc.data().name;
          const isPaid = garageDoc.data().isPaid || false; // Fetch payment status
          const billingRef = collection(db, `garages/${garageDoc.id}/billing`);
          const billingSnapshot = await getDocs(billingRef);

          let totalOrders = 0;
          let totalPaymentToGarage = 0;
          let totalBillAmount = 0;

          billingSnapshot.forEach((billingDoc) => {
            if (selectedDate && billingDoc.id !== selectedDate) return; // Filter by selected date
            const orders = billingDoc.data().orders || [];

            totalOrders += orders.length;
            orders.forEach((order) => {
              const billAmount = order.billAmount || 0;
              const commission = order.commission || 0;
              totalBillAmount += billAmount;
              totalPaymentToGarage += billAmount - commission;
            });
          });

          if (totalOrders > 0) {
            garagesData.push({
              id: garageDoc.id,
              garageName,
              totalOrders,
              totalBillAmount,
              totalPaymentToGarage,
              isPaid, // Include payment status
            });
          }
        };

        const promises = garagesSnapshot.docs.map(processGarage);
        await Promise.all(promises);

        setGarages(garagesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching garages:', error);
        setLoading(false);
      }
    };

    fetchGarages();
  }, [selectedDate]);

  // Fetch detailed billing information for a selected garage and date
  const handleViewBills = async (garage) => {
    setSelectedGarage(garage);
    try {
      const billingRef = collection(db, `garages/${garage.id}/billing`);
      const billingSnapshot = await getDocs(billingRef);

      let totalBillAmount = 0;
      let totalPaymentToGarage = 0;
      const bills = [];

      billingSnapshot.forEach(async (billingDoc) => {
        if (billingDoc.id === selectedDate) {
          const orders = billingDoc.data().orders || [];

          for (const order of orders) {
            const orderRef = order.orderId; // Assuming orderId is a reference
            const orderSnapshot = await getDoc(orderRef);
            const orderData = orderSnapshot.data();

            const billAmount = order.billAmount || 0;
            const commission = order.commission || 0;
            const paymentToGarage = billAmount - commission;

            bills.push({
              orderId: orderSnapshot.id,
              billAmount,
              paymentToGarage,
              orderDetails: orderData, // Add the full order details if needed
            });

            totalBillAmount += billAmount;
            totalPaymentToGarage += paymentToGarage;
          }

          setBillDetails(bills);
          setTotals({ totalBillAmount, totalPaymentToGarage });
          setOpenDialog(true);
        }
      });
    } catch (error) {
      console.error('Error fetching billing details:', error);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setBillDetails([]);
  };

  const handleDateChange = (event) => {
    const date = new Date(event.target.value);
    const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    setSelectedDate(formattedDate);
  };

  const handlePaymentStatusChange = async (garageId, checked) => {
    try {
      const garageDocRef = doc(db, 'garages', garageId);
      await updateDoc(garageDocRef, { isPaid: checked });
      setGarages((prevGarages) =>
        prevGarages.map((garage) =>
          garage.id === garageId ? { ...garage, isPaid: checked } : garage
        )
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="billing-page">
      <h1>Billing</h1>

      {/* Date Picker */}
      <TextField
        label="Select Date"
        type="date"
        onChange={handleDateChange}
        InputLabelProps={{ shrink: true }}
      />

      {/* Billing Table */}
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
                    onChange={(e) => handlePaymentStatusChange(garage.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleViewBills(garage)}>
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

      {/* Bill Details Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Bill Details
          <IconButton onClick={handleDialogClose} style={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Bill Amount (Rs.)</TableCell>
                <TableCell>Payment to Garage (Rs.)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billDetails.map((bill, index) => (
                <TableRow key={index}>
                  <TableCell>{bill.orderId}</TableCell>
                  <TableCell>{bill.billAmount.toFixed(2)}</TableCell>
                  <TableCell>{bill.paymentToGarage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell>{totals.totalBillAmount.toFixed(2)}</TableCell>
                <TableCell>{totals.totalPaymentToGarage.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingPage;
