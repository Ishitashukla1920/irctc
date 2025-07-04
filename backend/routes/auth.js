import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// Register 
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user?.id;

    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Not "row not found"
      return res.status(500).json({ error: 'Failed to check user profile' });
    }

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: userId, full_name, phone }]);

      if (profileError) {
        return res.status(400).json({ error: profileError.message });
      }
    }

    return res.status(201).json({
      message: 'User registered successfully',
      user: data.user,
      session: data.session
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});


// Login 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: 'Login successful',
      user: data.user,
      profile,
      session: data.session,
      access_token: data.session.access_token
    });

  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      user,
      profile
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;