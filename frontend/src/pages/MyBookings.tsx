import React, { useState, useEffect } from 'react';
import { Calendar, Train, MapPin, Clock, User, CreditCard, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  seat_number: number;
  booking_status: string;
  passenger_name: string;
  passenger_age: number;
  passenger_gender: string;
  booking_date: string;
  trains: {
    train_number: string;
    train_name: string;
    source: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    journey_date: string;
    price: number;
  };
}

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  
  useEffect(() => {
    fetchBookings();
  }, []);

 
  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings/my-bookings');
      setBookings(response.data.bookings);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  
  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancelLoading(bookingId); 
    try {
       console.log("Deleting booking ID:", bookingId);
      const response = await api.delete(`/bookings/${bookingId}`);
      toast.success('Booking cancelled successfully');
      fetchBookings();  
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancelLoading(null); 
    }
  };

  
  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

 
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{bookings.length} booking(s)</span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <Train className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-500">Start by searching for trains and make your first booking!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Train className="h-6 w-6 text-primary-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{booking.trains.train_name}</h3>
                      <p className="text-sm text-gray-500">{booking.trains.train_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.booking_status)}`}>
                      {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                    </span>
                    {booking.booking_status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelLoading === booking.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                        title="Cancel booking"
                      >
                        {cancelLoading === booking.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.trains.source}</p>
                      <p className="text-sm text-gray-500">From</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.trains.destination}</p>
                      <p className="text-sm text-gray-500">To</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatTime(booking.trains.departure_time)}
                      </p>
                      <p className="text-sm text-gray-500">Departure</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(booking.trains.journey_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-500">Journey Date</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Passenger</p>
                      <p className="font-medium text-gray-900">{booking.passenger_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Age</p>
                      <p className="font-medium text-gray-900">{booking.passenger_age}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Seat</p>
                      <p className="font-medium text-gray-900">#{booking.seat_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-medium text-green-600">₹{booking.trains.price}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Booked on {format(new Date(booking.booking_date), 'PPP p')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
