import express from 'express';
import { supabase, supabaseAdmin } from '../config/database.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

//Search trains
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { source, destination, date } = req.query;

    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    let query = supabase
      .from('trains')
      .select('*')
      .ilike('source', `%${source}%`)
      .ilike('destination', `%${destination}%`)
      .gt('available_seats', 0);

    if (date) {
      query = query.eq('journey_date', date);
    }

    const { data: trains, error } = await query.order('departure_time');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      trains,
      count: trains.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

//Get all trains
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: trains, error } = await supabase
      .from('trains')
      .select('*')
      .order('departure_time');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ trains });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trains' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: train, error } = await supabase
      .from('trains')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Train not found' });
    }

    res.json({ train });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch train' });
  }
});

//Admin:Add new train
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      train_number,
      train_name,
      source,
      destination,
      total_seats,
      departure_time,
      arrival_time,
      journey_date,
      price
    } = req.body;

    if (!train_number || !train_name || !source || !destination || !total_seats) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const { data: train, error } = await supabaseAdmin
  .from('trains')
  .insert([{
    train_number,
    name: train_name, 
    source,
    destination,
    total_seats,
    available_seats: total_seats,
    departure_time,
    arrival_time,
    journey_date,
    price
  }])
  .select()
  .single();


    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Train added successfully',
      train
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to add train' });
  }
});

// Admin: Update train
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: train, error } = await supabaseAdmin
      .from('trains')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Train updated successfully',
      train
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update train' });
  }
});
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: trains, error } = await supabase
      .from('trains')
      .select('*')
      .eq('journey_date', today)
      .gt('available_seats', 0)
      .order('departure_time');

    if (error) return res.status(500).json({ error: error.message });

    res.json({ trains });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today\'s trains' });
  }
});


export default router;