import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import '../styles/OnboardingForm.css';

export default function OnboardingForm({ approval, onSubmit, onCancel }) {
  const isSurveyor = approval.appliedFor === 'SURVEYOR';
  const isGarage = approval.appliedFor === 'GARAGE';

  const initialState = {
    technicianName: '',
    mobileNumber: '',
    dob: '',
    aadharCard: [],
    panCard: [],
    passportSizePhoto: [],
    qrCode: [],
    excelSheet: [],
    ...(isSurveyor ? {} : {
      workExperience: '',
      workshopName: '',
      boardSize: '',
      workingHours: '',
      weeklyOff: [],
      workingBrand: [],
      oilBrand: [],
      shopPhotos: [],
      workshopAddress: '',
      landmark: '',
      pincode: ''
    })
  };

  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, type, checked, value, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked ? [...prev[name], value] : prev[name].filter(item => item !== value)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const uploadFiles = async (files) => {
    const uploadPromises = Array.from(files).map(file => {
      const storageRef = ref(storage, `uploads/${file.name}-${Date.now()}`);
      return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
    });
    return Promise.all(uploadPromises);
  };

  const parseExcel = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        resolve(jsonData);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const createVehicleDocuments = async (docId, vehicleData) => {
    const vehiclePromises = vehicleData.map(async ({ name, power, services }) => {
      const vehicleDocRef = doc(db, `garages/${docId}/vehicles/${name}-${power}`);
      await setDoc(vehicleDocRef, {
        name,
        power,
        services: services || {}
      });
    });
    return Promise.all(vehiclePromises);
  };

  const initializeCollections = async (docId, isGarage) => {
    if (isGarage) {
      // Initialize empty billing collection
      await setDoc(doc(db, `garages/${docId}/billing/default`), {
        created: new Date()
      });

      // Initialize empty bookings collection
      await setDoc(doc(db, `garages/${docId}/bookings/default`), {
        created: new Date()
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Get the approval document to access required fields
      const approvalDoc = await getDoc(doc(db, 'approvals', approval.id));
      const approvalData = approvalDoc.data();

      const aadharCardURLs = await uploadFiles(Array.from(formData.aadharCard));
      const panCardURLs = await uploadFiles(Array.from(formData.panCard));
      const passportSizePhotoURLs = await uploadFiles(Array.from(formData.passportSizePhoto));
      const excelSheetURLs = await uploadFiles(Array.from(formData.excelSheet));
      const qrCodeURLs = await uploadFiles(Array.from(formData.qrCode));

      let shopPhotosURLs = [];
      let otherData = {};

      if (!isSurveyor) {
        shopPhotosURLs = await uploadFiles(Array.from(formData.shopPhotos));
        otherData = {
          workExperience: formData.workExperience,
          workshopName: formData.workshopName,
          boardSize: formData.boardSize,
          workingHours: formData.workingHours,
          weeklyOff: formData.weeklyOff,
          workingBrand: formData.workingBrand,
          oilBrand: formData.oilBrand,
          shopPhotos: shopPhotosURLs,
        };
      }

      if (isSurveyor) {
        // Create surveyor document
        await setDoc(doc(db, 'surveyors', approval.id), {
          name: approvalData.name,
          location: approvalData.location,
          ongoingBookings: [],
          technicianName: formData.technicianName,
          mobileNumber: formData.mobileNumber,
          dob: formData.dob,
          aadharCard: aadharCardURLs,
          panCard: panCardURLs,
          passportSizePhoto: passportSizePhotoURLs,
          approvalId: approval.id,
          createdAt: new Date()
        });
      } else if (isGarage) {
        // Create document in garages collection with only essential information
        await setDoc(doc(db, 'garages', approval.id), {
          name: approvalData.garageName,
          location: approvalData.location,
          phoneNumber: `+91${approvalData.ownerPhoneNumber}`,
        });

        // Store complete information in garageInformation collection
        await setDoc(doc(db, 'garageInformation', approval.id), {
          technicianName: formData.technicianName,
          mobileNumber: formData.mobileNumber,
          dob: formData.dob,
          aadharCard: aadharCardURLs,
          panCard: panCardURLs,
          passportSizePhoto: passportSizePhotoURLs,
          excelSheet: excelSheetURLs,
          qrCode: qrCodeURLs, 
          approvalId: approval.id,
          ...otherData,
          createdAt: new Date()
        });

        // Initialize sub-collections: billing, bookings, vehicles
        await initializeCollections(approval.id, true);

        // Process Excel data if available
        if (formData.excelSheet.length > 0) {
          const excelFile = formData.excelSheet[0];
          const parsedData = await parseExcel(excelFile);
          const servicesRow = parsedData.slice(2).map(row => row[0]);
          const vehicleData = [];

          for (let col = 1; col < parsedData[0].length; col++) {
            const vehicleName = parsedData[1][col];
            const power = parsedData[0][col];
            const services = {};

            for (let row = 2; row < parsedData.length; row++) {
              const serviceName = servicesRow[row - 2];
              const price = parsedData[row][col];
              if (serviceName && price !== undefined) {
                services[serviceName] = price;
              }
            }

            if (vehicleName) {
              vehicleData.push({
                name: vehicleName,
                power: `${power}`,
                services: Object.keys(services).length > 0 ? services : {}
              });
            }
          }

          await createVehicleDocuments(approval.id, vehicleData);
        }
      }

      setLoading(false);
      onSubmit();
      alert('Onboarding form submitted successfully.');
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('Failed to submit the form. Please try again.');
      setLoading(false);
    }
  };

  // Rest of the component remains exactly the same
  return (
    <div className="onboarding-form-wrapper">
      <div className="onboarding-form">
        <div className="form-title">Onboarding Form</div>
        <form onSubmit={handleSubmit} className="form-content">
          {/* All form fields remain exactly the same as in the original code */}
          <div className="form-group">
            <label>{isSurveyor ? 'Name' : 'Technician Name'}</label>
            <input
              type="text"
              name="technicianName"
              value={formData.technicianName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input
              type="text"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
            />
          </div>
          {!isSurveyor && (
            <>
              <div className="form-group">
                <label>Workshop Address</label>
                <input
                  type="text"
                  name="workshopAddress"
                  value={formData.workshopAddress}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Landmark</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Work Experience</label>
                <div>
                  {['0-2 Years', '2-4 Years', '4-6 Years', '6-8 Years', 'More than 8 Years'].map(option => (
                    <label key={option} className="radio-label">
                      <input
                        type="radio"
                        name="workExperience"
                        value={option}
                        checked={formData.workExperience === option}
                        onChange={handleChange}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Workshop Name</label>
                <input
                  type="text"
                  name="workshopName"
                  value={formData.workshopName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Board Size</label>
                <input
                  type="text"
                  name="boardSize"
                  value={formData.boardSize}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Working Hours</label>
                <input
                  type="text"
                  name="workingHours"
                  value={formData.workingHours}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Weekly Off</label>
                <div>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <label key={day} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="weeklyOff"
                        value={day}
                        checked={formData.weeklyOff.includes(day)}
                        onChange={handleChange}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Working Brand</label>
                <div>
                  {['Brand1', 'Brand2', 'Brand3'].map(brand => (
                    <label key={brand} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="workingBrand"
                        value={brand}
                        checked={formData.workingBrand.includes(brand)}
                        onChange={handleChange}
                      />
                      {brand}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Oil Brand</label>
                <div>
                  {['Oil1', 'Oil2', 'Oil3'].map(oil => (
                    <label key={oil} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="oilBrand"
                        value={oil}
                        checked={formData.oilBrand.includes(oil)}
                        onChange={handleChange}
                      />
                      {oil}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Shop Photos</label>
                <input
                  type="file"
                  name="shopPhotos"
                  multiple
                  onChange={handleChange}
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Aadhar Card</label>
            <input
              type="file"
              name="aadharCard"
              multiple
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>PAN Card</label>
            <input
              type="file"
              name="panCard"
              multiple
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Passport Size Photo</label>
            <input
              type="file"
              name="passportSizePhoto"
              multiple
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>QR Code</label>
            <input
              type="file"
              name="qrCode"
              onChange={handleChange}
              required
            />
          </div>
          {!isSurveyor && (
            <div className="form-group">
              <label>Upload Excel Sheet (Vehicle Data)</label>
              <input
                type="file"
                name="excelSheet"
                accept=".xlsx, .xls"
                onChange={handleChange}
              />
            </div>
          )}
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}