import React, { useState } from 'react';
import { Search, Train, Clock, MapPin, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BookingModal from '../components/BookingModal';
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
  total_seats: number;
}

const SearchTrains: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    source: '',
    destination: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchParams.source || !searchParams.destination) {
      toast.error('Please enter both source and destination');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/trains/search', {
        params: searchParams
      });
      setTrains(response.data.trains);
      if (response.data.trains.length === 0) {
        toast('No trains found for the selected route');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (train: Train) => {
    setSelectedTrain(train);
    setShowBookingModal(true);
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Trains</h1>
        
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchParams.source}
                onChange={(e) => setSearchParams({...searchParams, source: e.target.value})}
                placeholder="Enter source station"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchParams.destination}
                onChange={(e) => setSearchParams({...searchParams, destination: e.target.value})}
                placeholder="Enter destination station"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Journey Date
            </label>
            <input
              type="date"
              value={searchParams.date}
              onChange={(e) => setSearchParams({...searchParams, date: e.target.value})}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <LoadingSpinner size="sm" /> : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {trains.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Available Trains</h2>
          {trains.map((train) => (
            <div key={train.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Train className="h-6 w-6 text-primary-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{train.train_name}</h3>
                      <p className="text-sm text-gray-500">{train.train_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{formatTime(train.departure_time)}</p>
                      <p className="text-sm text-gray-500">{train.source}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{formatTime(train.arrival_time)}</p>
                      <p className="text-sm text-gray-500">{train.destination}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{train.available_seats} available</span>
                    </div>
                    <p className="text-lg font-bold text-primary-600">₹{train.price}</p>
                  </div>
                  
                  <button
                    onClick={() => handleBooking(train)}
                    disabled={train.available_seats === 0}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {train.available_seats === 0 ? 'Sold Out' : 'Book Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBookingModal && selectedTrain && (
        <BookingModal
          train={selectedTrain}
          onClose={() => setShowBookingModal(false)}
          onBookingSuccess={() => {
            setShowBookingModal(false);
            handleSearch(new Event('submit') as any);
          }}
        />
      )}
    </div>
  );
};

export default SearchTrains;