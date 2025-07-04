import React, { useState } from 'react';
import { X, User, Calendar, CreditCard } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface Train {
  id: string;
  train_number: string;
  train_name: string;
  source: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  journey_date: string;
  price: number;
  available_seats: number;
}

interface BookingModalProps {
  train: Train;
  onClose: () => void;
  onBookingSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ train, onClose, onBookingSuccess }) => {
  const [formData, setFormData] = useState({
    passenger_name: '',
    passenger_age: '',
    passenger_gender: 'male'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.passenger_name || !formData.passenger_age) {
      toast.error('Please fill in all passenger details');
      return;
    }

    if (parseInt(formData.passenger_age) < 1 || parseInt(formData.passenger_age) > 120) {
      toast.error('Please enter a valid age');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/bookings', {
        train_id: train.id,
        passenger_name: formData.passenger_name,
        passenger_age: parseInt(formData.passenger_age),
        passenger_gender: formData.passenger_gender
      });

      toast.success(`Booking confirmed! Seat ${response.data.seat_number} assigned`);
      onBookingSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Book Ticket</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Train Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{train.train_name}</h3>
            <p className="text-sm text-gray-600 mb-2">Train No: {train.train_number}</p>
            <div className="flex items-center justify-between text-sm">
              <span>{train.source} → {train.destination}</span>
              <span>{formatTime(train.departure_time)} - {formatTime(train.arrival_time)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-primary-600">₹{train.price}</span>
              <span className="text-sm text-gray-500">{train.available_seats} seats available</span>
            </div>
          </div>

          {/* Passenger Details Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passenger Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.passenger_name}
                  onChange={(e) => setFormData({...formData, passenger_name: e.target.value})}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Enter passenger name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={formData.passenger_age}
                  onChange={(e) => setFormData({...formData, passenger_age: e.target.value})}
                  required
                  min="1"
                  max="120"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Enter age"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                value={formData.passenger_gender}
                onChange={(e) => setFormData({...formData, passenger_gender: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Payment Summary</p>
                  <p className="text-sm text-yellow-700">Total Amount: ₹{train.price}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;