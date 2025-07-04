/*
  # Railway Management System Database Schema

  1. New Tables
    - `trains`
      - `id` (uuid, primary key)
      - `train_number` (varchar, unique)
      - `train_name` (varchar)
      - `source` (varchar)
      - `destination` (varchar)
      - `total_seats` (integer)
      - `available_seats` (integer)
      - `departure_time` (time)
      - `arrival_time` (time)
      - `journey_date` (date)
      - `price` (decimal)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `train_id` (uuid, foreign key to trains)
      - `seat_number` (integer)
      - `booking_status` (varchar)
      - `passenger_name` (varchar)
      - `passenger_age` (integer)
      - `passenger_gender` (varchar)
      - `booking_date` (timestamptz)
      - `created_at` (timestamptz)
    
    - `profiles`
      - `id` (uuid, primary key, foreign key to auth.users)
      - `full_name` (varchar)
      - `phone` (varchar)
      - `is_admin` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add admin policies for train management
    - Add race-condition-safe booking function

  3. Functions
    - Auto-create user profiles on signup
    - Race-condition-safe seat booking function
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view trains" ON trains;
  DROP POLICY IF EXISTS "Only admins can insert trains" ON trains;
  DROP POLICY IF EXISTS "Only admins can update trains" ON trains;
  DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
  DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
  DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
  DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create trains table
CREATE TABLE IF NOT EXISTS trains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_number varchar(20) UNIQUE NOT NULL,
  train_name varchar(100) NOT NULL,
  source varchar(100) NOT NULL,
  destination varchar(100) NOT NULL,
  total_seats integer NOT NULL DEFAULT 0,
  available_seats integer NOT NULL DEFAULT 0,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  journey_date date NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  train_id uuid REFERENCES trains(id) ON DELETE CASCADE,
  seat_number integer NOT NULL,
  booking_status varchar(20) DEFAULT 'confirmed',
  passenger_name varchar(100) NOT NULL,
  passenger_age integer NOT NULL,
  passenger_gender varchar(10) NOT NULL,
  booking_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(train_id, seat_number)
);

-- Create profiles table for additional user info
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name varchar(100),
  phone varchar(20),
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trains ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trains
CREATE POLICY "Anyone can view trains"
  ON trains
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert trains"
  ON trains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update trains"
  ON trains
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle seat booking with race condition safety
CREATE OR REPLACE FUNCTION book_seat(
  p_train_id uuid,
  p_user_id uuid,
  p_passenger_name varchar,
  p_passenger_age integer,
  p_passenger_gender varchar
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
  
  -- Check if seats are available
  IF v_train_record.available_seats <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No seats available',
      'booking_id', null
    );
  END IF;
  
  -- Calculate next seat number
  SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_seat_number
  FROM bookings
  WHERE train_id = p_train_id;
  
  -- Create booking
  INSERT INTO bookings (user_id, train_id, seat_number, passenger_name, passenger_age, passenger_gender)
  VALUES (p_user_id, p_train_id, v_seat_number, p_passenger_name, p_passenger_age, p_passenger_gender)
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
    'booking_id', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample trains (only if they don't exist)
INSERT INTO trains (train_number, train_name, source, destination, total_seats, available_seats, departure_time, arrival_time, journey_date, price)
VALUES 
  ('12345', 'Rajdhani Express', 'Delhi', 'Mumbai', 100, 100, '06:00:00', '20:00:00', '2025-01-15', 2500.00),
  ('67890', 'Shatabdi Express', 'Delhi', 'Chandigarh', 80, 80, '07:00:00', '11:00:00', '2025-01-15', 800.00),
  ('11111', 'Duronto Express', 'Mumbai', 'Kolkata', 120, 120, '22:00:00', '18:00:00', '2025-01-16', 3200.00),
  ('22222', 'Garib Rath', 'Delhi', 'Kolkata', 90, 90, '23:00:00', '17:00:00', '2025-01-16', 1800.00),
  ('33333', 'Humsafar Express', 'Mumbai', 'Delhi', 100, 100, '05:30:00', '19:30:00', '2025-01-15', 2800.00)
ON CONFLICT (train_number) DO NOTHING;