import React, { useState } from 'react';
import { db, storage } from '../firebase'; // Import db and storage from your firebase configuration
import { addDoc, collection, doc, setDoc, GeoPoint } from 'firebase/firestore'; // Import necessary Firestore functions
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/OnboardingForm.css';

export default function OnboardingForm({ approval, onSubmit, onCancel }) {
  const isSurveyor = approval.appliedFor === 'Surveyor';

  const [formData, setFormData] = useState({
    technicianName: '',
    mobileNumber: '',
    workshopAddress: '',
    landmark: '',
    pincode: '',
    aadharCard: [],
    dob: '',
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
      shopPhotos: []
    })
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked ? [...prev[name], value] : prev[name].filter(item => item !== value)
      }));
    } else if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const uploadFiles = async (files) => {
    const uploadPromises = [];
    for (const file of files) {
      const storageRef = ref(storage, `uploads/${file.name}-${Date.now()}`);
      const uploadTask = uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
      uploadPromises.push(uploadTask);
    }
    return Promise.all(uploadPromises);
  };

  const createAdditionalDocument = async (collectionName, docId, data) => {
    await setDoc(doc(db, collectionName, docId), data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Upload files and get URLs
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
          shopPhotos: shopPhotosURLs
        };
      }

      // Prepare the data to store in Firestore
      const dataToStore = {
        ...formData,
        ...otherData,
        aadharCard: aadharCardURLs,
        panCard: panCardURLs,
        passportSizePhoto: passportSizePhotoURLs,
        excelSheet: excelSheetURLs,
        approvalId: approval.id,
      };

      // Add a new document to the appropriate collection
      const collectionName = isSurveyor ? 'surveyorInformation' : 'garageInformation';
      const docRef = await addDoc(collection(db, collectionName), dataToStore);

      // Create additional document in 'garages' or 'surveyors' collection
      if (isSurveyor) {
        await createAdditionalDocument('surveyors', approval.id, {
          location: new GeoPoint(41.878113, -87.629799),
          name: 'alex',
          ongoingBookings: [""]
        });
      } else {
        await createAdditionalDocument('garages', approval.id, {
          location: new GeoPoint(47.774929, -72.419418),
          name: 'gar1'
        });
        // Optionally, create a sub-collection 'bookings'
        await setDoc(doc(db, 'garages', approval.id, 'bookings', 'dummyBooking'), {});
      }

      // Close the form and notify success
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
          {!isSurveyor && (
            <>
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
                  {['Castrol', 'Mobil', 'Shell', 'Gulf', 'Total', 'Petronas'].map(brand => (
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
                  multiple
                  onChange={handleChange}
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label>{isSurveyor ? 'Address' : 'Workshop Address'}</label>
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
            <label>Aadhar Card</label>
            <input
              type="file"
              name="aadharCard"
              multiple
              onChange={handleChange}
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
          <div className="form-group">
            <label>PAN Card</label>
            <input
              type="file"
              name="panCard"
              multiple
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Passport Size Photo</label>
            <input
              type="file"
              name="passportSizePhoto"
              multiple
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Excel Sheet</label>
            <input
              type="file"
              name="excelSheet"
              multiple
              onChange={handleChange}
            />
          </div>
          <div className="form-actions">
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
