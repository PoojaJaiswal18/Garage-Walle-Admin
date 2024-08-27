import React, { useState } from 'react';
import '../styles/OnboardingForm.css';

export default function OnboardingForm({ approval, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    technicianName: '',
    mobileNumber: '',
    workExperience: '',
    workshopName: '',
    workshopAddress: '',
    landmark: '',
    pincode: '',
    boardSize: '',
    workingHours: '',
    weeklyOff: [],
    workingBrand: [],
    oilBrand: [],
    shopPhotos: [],
    aadharCard: [],
    dob: '',
    panCard: [],
    passportSizePhoto: [],
    excelSheet: []
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked ? [...prev[name], value] : prev[name].filter(item => item !== value)
      }));
    } else if (type === 'radio') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="onboarding-form-wrapper">
      <div className="onboarding-form">
        <div className="form-title">Onboarding Form</div>
        <form onSubmit={handleSubmit} className="form-content">
          <div className="form-group">
            <label>Technician Name</label>
            <input type="text" name="technicianName" value={formData.technicianName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required />
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
            <input type="text" name="workshopName" value={formData.workshopName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Workshop Address</label>
            <input type="text" name="workshopAddress" value={formData.workshopAddress} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Landmark</label>
            <input type="text" name="landmark" value={formData.landmark} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Pincode</label>
            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Board Size</label>
            <input type="text" name="boardSize" value={formData.boardSize} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Working Hours</label>
            <input type="text" name="workingHours" value={formData.workingHours} onChange={handleChange} required />
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
              {['Motul', 'Castrol', 'Vedol', 'Mobil', 'Liquid Gun', 'Others'].map(brand => (
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
            <input type="file" name="shopPhotos" multiple onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Aadhar Card</label>
            <input type="file" name="aadharCard" multiple onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>PAN Card</label>
            <input type="file" name="panCard" multiple onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Owner Passport Size Photo</label>
            <input type="file" name="passportSizePhoto" multiple onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Excel Sheet</label>
            <input type="file" name="excelSheet" onChange={handleChange} />
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-button">Submit</button>
            <button type="button" className="cancel-button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

