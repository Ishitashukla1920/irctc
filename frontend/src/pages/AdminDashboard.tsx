import React, { useState, useEffect } from 'react';
import { Plus, Edit, Train, Clock, MapPin, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
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
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTrain, setEditingTrain] = useState<Train | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    train_number: '',
    train_name: '',
    source: '',
    destination: '',
    departure_time: '',
    arrival_time: '',
    journey_date: format(new Date(), 'yyyy-MM-dd'),
    price: '',
    total_seats: ''
  });

  useEffect(() => {
    fetchTrains();
  }, []);

  const fetchTrains = async () => {
    try {
      const response = await api.get('/trains');
      setTrains(response.data.trains);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch trains');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.train_number || !formData.train_name || !formData.source || !formData.destination) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitLoading(true);
    try {
      const adminApiKey = prompt('Enter admin API key:');
      if (!adminApiKey) {
        toast.error('Admin API key is required');
        return;
      }

      const requestData = {
        ...formData,
        price: parseFloat(formData.price),
        total_seats: parseInt(formData.total_seats)
      };

      const config = {
        headers: {
          'x-api-key': adminApiKey
        }
      };

      if (editingTrain) {
        await api.put(`/trains/${editingTrain.id}`, requestData, config);
        toast.success('Train updated successfully');
      } else {
        await api.post('/trains', requestData, config);
        toast.success('Train added successfully');
      }

      resetForm();
      fetchTrains();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      train_number: '',
      train_name: '',
      source: '',
      destination: '',
      departure_time: '',
      arrival_time: '',
      journey_date: format(new Date(), 'yyyy-MM-dd'),
      price: '',
      total_seats: ''
    });
    setShowAddForm(false);
    setEditingTrain(null);
  };

  const handleEdit = (train: Train) => {
    setEditingTrain(train);
    setFormData({
      train_number: train.train_number,
      train_name: train.train_name,
      source: train.source,
      destination: train.destination,
      departure_time: train.departure_time,
      arrival_time: train.arrival_time,
      journey_date: train.journey_date,
      price: train.price.toString(),
      total_seats: train.total_seats.toString()
    });
    setShowAddForm(true);
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Train</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingTrain ? 'Edit Train' : 'Add New Train'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Train Number *
              </label>
              <input
                type="text"
                value={formData.train_number}
                onChange={(e) => setFormData({...formData, train_number: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder="e.g., 12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Train Name *
              </label>
              <input
                type="text"
                value={formData.train_name}
                onChange={(e) => setFormData({...formData, train_name: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder="e.g., Rajdhani Express"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source *
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder="e.g., Delhi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination *
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder="e.g., Mumbai"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departure Time *
              </label>
              <input
                type="time"
                value={formData.departure_time}
                onChange={(e) => setFormData({...formData, departure_time: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arrival Time *
              </label>
              <input
                type="time"
                value={formData.arrival_time}
                onChange={(e) => setFormData({...formData, arrival_time: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Journey Date *
              </label>
              <input
                type="date"
                value={formData.journey_date}
                onChange={(e) => setFormData({...formData, journey_date: e.target.value})}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder="e.g., 2500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Seats *
              </label>
              <input
                type="number"
                value={formData.total_seats}
                onChange={(e) => setFormData({...formData, total_seats: e.target.value})}
                required
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder="e.g., 100"
              />
            </div>

            <div className="md:col-span-2 flex space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitLoading ? <LoadingSpinner size="sm" /> : (editingTrain ? 'Update Train' : 'Add Train')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Train className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Trains</p>
              <p className="text-2xl font-bold text-gray-900">{trains.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Available Seats</p>
              <p className="text-2xl font-bold text-gray-900">
                {trains.reduce((sum, train) => sum + train.available_seats, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Seats</p>
              <p className="text-2xl font-bold text-gray-900">
                {trains.reduce((sum, train) => sum + train.total_seats, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Occupancy</p>
              <p className="text-2xl font-bold text-gray-900">
                {trains.length > 0 ? (
                  Math.round((1 - trains.reduce((sum, train) => sum + train.available_seats, 0) / trains.reduce((sum, train) => sum + train.total_seats, 0)) * 100)
                ) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Trains</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Train</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seats</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trains.map((train) => (
                <tr key={train.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{train.train_name}</div>
                      <div className="text-sm text-gray-500">{train.train_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{train.source} → {train.destination}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatTime(train.departure_time)} - {formatTime(train.arrival_time)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(train.journey_date), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{train.available_seats}/{train.total_seats}</div>
                    <div className="text-sm text-gray-500">
                      {Math.round((1 - train.available_seats / train.total_seats) * 100)}% booked
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{train.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(train)}
                      className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;