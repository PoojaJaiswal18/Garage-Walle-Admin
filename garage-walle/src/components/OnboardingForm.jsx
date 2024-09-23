import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import '../styles/OnboardingForm.css';

export default function OnboardingForm({ approval, onSubmit, onCancel }) {
  const isSurveyor = approval.appliedFor === 'Surveyor';

  const initialState = {
    technicianName: '',
    mobileNumber: '',
    dob: '', // Date of Birth field
    aadharCard: [],
    panCard: [],
    passportSizePhoto: [],
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
      workshopAddress: '',  // For garage
      landmark: '',         // For garage
      pincode: ''           // For garage
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
      const vehicleDocRef = doc(db, `garageInformation/${docId}/vehicles/${name}-${power}`);
      await setDoc(vehicleDocRef, {
        name,
        power,
        services: services || {}  // Ensure services is an object, even if empty
      });
    });
    return Promise.all(vehiclePromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const aadharCardURLs = await uploadFiles(Array.from(formData.aadharCard));
      const panCardURLs = await uploadFiles(Array.from(formData.panCard));
      const passportSizePhotoURLs = await uploadFiles(Array.from(formData.passportSizePhoto));
      const excelSheetURLs = await uploadFiles(Array.from(formData.excelSheet));

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
          workshopAddress: formData.workshopAddress,
          landmark: formData.landmark,
          pincode: formData.pincode
        };
      }

      const dataToStore = {
        technicianName: formData.technicianName,
        mobileNumber: formData.mobileNumber,
        dob: formData.dob, // Adding Date of Birth to Firestore
        aadharCard: aadharCardURLs,
        panCard: panCardURLs,
        passportSizePhoto: passportSizePhotoURLs,
        excelSheet: excelSheetURLs,
        approvalId: approval.id,
        ...otherData
      };

      const collectionName = isSurveyor ? 'surveyorInformation' : 'garageInformation';
      const docRef = await addDoc(collection(db, collectionName), dataToStore);

      if (!isSurveyor && formData.excelSheet.length > 0) {
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

        await createVehicleDocuments(docRef.id, vehicleData);
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

  return (
    <div className="onboarding-form-wrapper">
      <div className="onboarding-form">
        <div className="form-title">Onboarding Form</div>
        <form onSubmit={handleSubmit} className="form-content">
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
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'All Day Working'].map(day => (
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
                  {['Aprilia', 'Bajaj', 'Hero', 'Honda', 'KTM', 'Mahindra', 'Royal Enfield', 'Suzuki', 'TVS', 'Vespa', 'Yamaha'].map(brand => (
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
                  {['Castrol', 'Motul', 'Shell', 'Gulf', 'Mobil', 'Others'].map(brand => (
                    <label key={brand} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="oilBrand"
                        value={brand}
                        checked={formData.oilBrand.includes(brand)}
                        onChange={handleChange}
                      />
                      {brand}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Shop Photos</label>
                <input
                  type="file"
                  name="shopPhotos"
                  accept="image/*"
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
              accept="image/*"
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
              accept="image/*"
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
              accept="image/*"
              multiple
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Excel Sheet</label>
            <input
              type="file"
              name="excelSheet"
              accept=".xlsx"
              onChange={handleChange}
              required={!isSurveyor}
            />
          </div>
          <div className="form-buttons">
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
