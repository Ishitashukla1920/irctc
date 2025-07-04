import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Book a seat
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { train_id, passenger_name, passenger_age, passenger_gender } = req.body;
    const user_id = req.user.id;

    if (!train_id || !passenger_name || !passenger_age || !passenger_gender) {
      return res.status(400).json({ error: 'All passenger details are required' });
    }

    const { data: result, error } = await supabase
      .rpc('book_seat', {
        p_train_id: train_id,
        p_user_id: user_id,
        p_passenger_name: passenger_name,
        p_passenger_age: passenger_age,
        p_passenger_gender: passenger_gender
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.status(201).json({
      message: result.message,
      booking_id: result.booking_id,
      seat_number: result.seat_number
    });

  } catch (error) {
    res.status(500).json({ error: 'Booking failed' });
  }
});

// Get user's bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: bookings, error } = await supabase
  .from('bookings')
  .select(`
    *,
    trains (
      train_number,
      train_name,
      source,
      destination,
      departure_time,
      arrival_time,
      journey_date,
      price
    )
  `)
  .eq('user_id', user_id)
  .order('created_at', { ascending: false });


    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ bookings });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trains (
          train_number,
          train_name,
          source,
          destination,
          departure_time,
          arrival_time,
          journey_date,
          price
        )
      `)
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});


// Cancel booking
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('train_id')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error("Error deleting booking:", deleteError);
      return res.status(500).json({ error: 'Failed to delete booking', details: deleteError });
    }

    const { error: updateError } = await supabase
      .from('trains')
      .update({ available_seats: supabase.raw('available_seats + 1') })
      .eq('id', booking.train_id);

    if (updateError) {
      console.error('Failed to update train seats:', updateError);
    }

    res.json({ message: 'Booking cancelled successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;