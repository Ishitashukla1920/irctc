/*
  # Railway Management System - Database Schema Update

  1. Tables
    - Ensures all required tables exist with proper structure
    - Updates existing tables if needed
    - Adds missing columns and constraints

  2. Functions
    - Creates/updates the race-condition-safe booking function
    - Creates/updates user profile creation trigger function

  3. Sample Data
    - Adds sample trains for testing (only if they don't exist)

  4. Security
    - All tables already have RLS enabled and proper policies
    - No policy changes needed as they already exist
*/

-- Ensure trains table has all required columns
DO $$
BEGIN
  -- Add train_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trains' AND column_name = 'train_name'
  ) THEN
    ALTER TABLE trains ADD COLUMN train_name text;
  END IF;

  -- Add journey_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trains' AND column_name = 'journey_date'
  ) THEN
    ALTER TABLE trains ADD COLUMN journey_date date DEFAULT CURRENT_DATE;
  END IF;

  -- Add price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trains' AND column_name = 'price'
  ) THEN
    ALTER TABLE trains ADD COLUMN price decimal(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Ensure bookings table has all required columns
DO $$
BEGIN
  -- Add passenger_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'passenger_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN passenger_name text NOT NULL DEFAULT '';
  END IF;

  -- Add passenger_age column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'passenger_age'
  ) THEN
    ALTER TABLE bookings ADD COLUMN passenger_age integer NOT NULL DEFAULT 0;
  END IF;

  -- Add passenger_gender column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'passenger_gender'
  ) THEN
    ALTER TABLE bookings ADD COLUMN passenger_gender text NOT NULL DEFAULT 'male';
  END IF;
END $$;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies only if they don't exist
DO $$
BEGIN
  -- Users can view their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- Users can insert their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Users can update their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Function to handle seat booking with race condition safety
CREATE OR REPLACE FUNCTION book_seat(
  p_train_id uuid,
  p_user_id uuid,
  p_passenger_name text,
  p_passenger_age integer,
  p_passenger_gender text
) RETURNS json AS $$
DECLARE
  v_seat_number integer;
  v_booking_id uuid;
  v_train_record trains%ROWTYPE;
BEGIN
  -- Lock the train row to prevent race conditions
  SELECT * INTO v_train_record
  FROM trains
  WHERE id = p_train_id
  FOR UPDATE;
  
  -- Check if train exists
  IF v_train_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Train not found',
      'booking_id', null,
      'seat_number', null
    );
  END IF;
  
  -- Check if seats are available
  IF v_train_record.available_seats <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No seats available',
      'booking_id', null,
      'seat_number', null
    );
  END IF;
  
  -- Calculate next seat number
  SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_seat_number
  FROM bookings
  WHERE train_id = p_train_id;
  
  -- Create booking
  INSERT INTO bookings (
    user_id, 
    train_id, 
    seat_number, 
    passenger_name, 
    passenger_age, 
    passenger_gender,
    booking_status
  )
  VALUES (
    p_user_id, 
    p_train_id, 
    v_seat_number, 
    p_passenger_name, 
    p_passenger_age, 
    p_passenger_gender,
    'confirmed'
  )
  RETURNING id INTO v_booking_id;
  
  -- Update available seats
  UPDATE trains
  SET available_seats = available_seats - 1,
      updated_at = now()
  WHERE id = p_train_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking successful',
    'booking_id', v_booking_id,
    'seat_number', v_seat_number
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Booking failed: ' || SQLERRM,
    'booking_id', null,
    'seat_number', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_trains_updated_at'
  ) THEN
    CREATE TRIGGER update_trains_updated_at
      BEFORE UPDATE ON trains
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_bookings_updated_at'
  ) THEN
    CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trains_source_destination ON trains(source, destination);
CREATE INDEX IF NOT EXISTS idx_trains_journey_date ON trains(journey_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_train_id ON bookings(train_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

-- Insert sample trains (only if they don't exist)
INSERT INTO trains (
  train_number, 
  name, 
  source, 
  destination, 
  total_seats, 
  available_seats, 
  departure_time, 
  arrival_time,
  train_name,
  journey_date,
  price
)
VALUES 
  ('12345', 'Rajdhani Express', 'Delhi', 'Mumbai', 100, 100, '06:00:00', '20:00:00', 'Rajdhani Express', '2025-01-15', 2500.00),
  ('67890', 'Shatabdi Express', 'Delhi', 'Chandigarh', 80, 80, '07:00:00', '11:00:00', 'Shatabdi Express', '2025-01-15', 800.00),
  ('11111', 'Duronto Express', 'Mumbai', 'Kolkata', 120, 120, '22:00:00', '18:00:00', 'Duronto Express', '2025-01-16', 3200.00),
  ('22222', 'Garib Rath', 'Delhi', 'Kolkata', 90, 90, '23:00:00', '17:00:00', 'Garib Rath', '2025-01-16', 1800.00),
  ('33333', 'Humsafar Express', 'Mumbai', 'Delhi', 100, 100, '05:30:00', '19:30:00', 'Humsafar Express', '2025-01-15', 2800.00)
ON CONFLICT (train_number) DO NOTHING;