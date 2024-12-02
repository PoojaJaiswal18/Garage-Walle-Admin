import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import '../styles/OnboardingForm.css';

const initializeCollections = async (garageId, isGarage = false) => {
  if (isGarage) {
    try {
      // Initialize ongoingBookings collection
      const ongoingBookingsRef = collection(db, 'garages', garageId, 'ongoingBookings');
      await addDoc(ongoingBookingsRef, { initialized: true });

      // Initialize completedBookings collection
      const completedBookingsRef = collection(db, 'garages', garageId, 'completedBookings');
      await addDoc(completedBookingsRef, { initialized: true });
    } catch (error) {
      console.error('Error initializing collections:', error);
      throw error;
    }
  }
};

const createDetailedVehicleDocuments = async (docId, vehicleData) => {
  try {
    const vehicleTypes = ['bikes', 'moped'];

    for (const vehicleType of vehicleTypes) {
      // Ensure the top-level vehicles document exists
      const vehiclesRef = doc(db, 'garages', docId, 'vehicles', vehicleType);
      await setDoc(vehiclesRef, { type: vehicleType }, { merge: true });

      // Iterate through power ranges
      for (const [powerRange, serviceData] of Object.entries(vehicleData[vehicleType])) {
        const powerRangeRef = doc(db, 'garages', docId, 'vehicles', vehicleType, 'powerRanges', powerRange);
        await setDoc(powerRangeRef, { powerRange }, { merge: true });

        // Iterate through service types
        for (const [serviceType, services] of Object.entries(serviceData)) {
          const serviceRef = doc(
            db,
            'garages',
            docId,
            'vehicles',
            vehicleType,
            'powerRanges',
            powerRange,
            'services',
            serviceType
          );

          // Set service-specific data
          await setDoc(serviceRef, services, { merge: true });
        }
      }
    }
  } catch (error) {
    console.error('Error creating vehicle documents:', error);
    throw error;
  }
};

const parseExcel = async (file) => {
  try {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const vehicleTypes = {
            bikes: ['100cc', '110cc', '125cc', '135cc', '150cc', '160cc', '180cc', '200cc', '220cc', '310cc', '350cc', 'more than 350cc'],
            moped: ['100cc', '110cc', '125cc', '150cc', 'more than 150cc'],
          };

          const parsedData = {
            bikes: {},
            moped: {},
          };

          const serviceTypes = ['generalServices', 'visitCharges', 'repairing'];
          const serviceRowMappings = {
            generalServices: [3, 4],
            visitCharges: [7, 8],
            repairing: [11, 22],
          };

          Object.keys(vehicleTypes).forEach(vehicleType => {
            vehicleTypes[vehicleType].forEach(powerRange => {
              parsedData[vehicleType][powerRange] = {};

              serviceTypes.forEach(serviceType => {
                const [row1, row2] = serviceRowMappings[serviceType];
                const columnRanges = vehicleType === 'bikes' ? ['B', 'N'] : ['O', 'S'];

                const headerRow = jsonData[1];
                const columnIndex = Object.keys(headerRow).find(key =>
                  headerRow[key] === powerRange &&
                  key >= columnRanges[0] &&
                  key <= columnRanges[1]
                );

                if (columnIndex !== undefined) {
                  const serviceName1 = jsonData[row1 - 1][1];
                  const serviceName2 = jsonData[row2 - 1][1];

                  parsedData[vehicleType][powerRange][serviceType] = {
                    [serviceName1]: { rate: jsonData[row1 - 1][columnIndex] || null },
                    [serviceName2]: { rate: jsonData[row2 - 1][columnIndex] || null },
                  };
                }
              });
            });
          });

          resolve(parsedData);
        } catch (error) {
          console.error('Excel parsing error:', error);
          reject(error);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('Error parsing Excel:', error);
    throw error;
  }
};

export default function OnboardingForm({ approval, onSubmit, onCancel }) {
  const isSurveyor = approval?.appliedFor === 'SURVEYOR';
  const isGarage = approval?.appliedFor === 'GARAGE';

  const initialState = {
    technicianName: '',
    mobileNumber: '',
    dob: '',
    aadharCard: [],
    panCard: [],
    passportSizePhoto: [],
    qrCode: [],
    excelSheet: [],
    weeklyOff: [],
    workingBrand: [],
    oilBrand: [],
    ...(isGarage ? {
      workExperience: '',
      workshopName: '',
      boardSize: '',
      workingHours: '',
      workshopAddress: '',
      landmark: '',
      pincode: '',
      shopPhotos: []
    } : {})
  };

  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, type, checked, value, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: files ? Array.from(files) : [] 
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => {
        const currentValues = prev[name] || []; 
        return {
          ...prev,
          [name]: checked 
            ? [...currentValues, value].filter((v, i, a) => a.indexOf(v) === i)
            : currentValues.filter(item => item !== value)
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const uploadFiles = async (files) => {
    try {
      const uploadPromises = files.map(file => {
        const storageRef = ref(storage, `uploads/${file.name}-${Date.now()}`);
        return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
      });
      return Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!approval || !approval.id) {
      alert('Invalid approval information');
      return;
    }

    setLoading(true);

    try {
      const approvalDoc = await getDoc(doc(db, 'approvals', approval.id));
      const approvalData = approvalDoc.data();

      const aadharCardURLs = await uploadFiles(formData.aadharCard || []);
      const panCardURLs = await uploadFiles(formData.panCard || []);
      const passportSizePhotoURLs = await uploadFiles(formData.passportSizePhoto || []);
      const qrCodeURLs = await uploadFiles(formData.qrCode || []);

      let shopPhotosURLs = [];
      let excelSheetURLs = [];
      let otherData = {};

      if (isGarage) {
        shopPhotosURLs = await uploadFiles(formData.shopPhotos || []);
        
        if (formData.excelSheet && formData.excelSheet.length > 0) {
          excelSheetURLs = await uploadFiles(formData.excelSheet);
          const excelFile = formData.excelSheet[0];
          const parsedVehicleData = await parseExcel(excelFile);
          await createDetailedVehicleDocuments(approval.id, parsedVehicleData);
        }

        otherData = {
          workExperience: formData.workExperience || '',
          workshopName: formData.workshopName || '',
          boardSize: formData.boardSize || '',
          workingHours: formData.workingHours || '',
          weeklyOff: formData.weeklyOff || [],
          workingBrand: formData.workingBrand || [],
          oilBrand: formData.oilBrand || [],
          shopPhotos: shopPhotosURLs,
          workshopAddress: formData.workshopAddress || '',
          landmark: formData.landmark || '',
          pincode: formData.pincode || ''
        };
      }

      if (isSurveyor) {
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
        await setDoc(doc(db, 'garages', approval.id), {
          name: approvalData.garageName,
          location: approvalData.location,
          phoneNumber: `+91${approvalData.ownerPhoneNumber}`,
        });

        await setDoc(doc(db, 'garageInformation', approval.id), {
          technicianName: formData.technicianName,
          mobileNumber: formData.mobileNumber,
          dob: formData.dob,
          aadharCard: aadharCardURLs,
          panCard: panCardURLs,
          passportSizePhoto: passportSizePhotoURLs,
          qrCode: qrCodeURLs,
          excelSheet: excelSheetURLs,
          approvalId: approval.id,
          ...otherData,
          createdAt: new Date()
        });

        await initializeCollections(approval.id, true);
      }

      if (isGarage) {
        await initializeCollections(approval.id, true);
      }

      setLoading(false);
      onSubmit();
      alert('Onboarding form submitted successfully.');
    } catch (error) {
      console.error('Error submitting form: ', error);
      alert(`Failed to submit the form: ${error.message}`);
      setLoading(false);
    }
  };
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
              {['APRILLIA', 'BAJAJ', 'HERO', 'HONDA', 'KTM', 'MAHINDRA', 'ROYAL ENFIELD', 'SUZUKI', 'TVS', 'VESPA', 'YAMAHA'].map((brand) => (
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
              {['MOTUL', 'CASTROL', 'VEDOL', 'MOBIL', 'LIQUID GUN', 'OTHERS'].map((oil) => (
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
)
};