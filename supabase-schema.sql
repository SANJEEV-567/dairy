-- ====================================================================
-- DR. SANJAY KUMAR DAIRY - POSTGRESQL & ROW-LEVEL SECURITY (RLS) SCHEMA
-- ====================================================================
-- This script sets up database-level security and row isolation.
-- Run this in the Supabase SQL Editor for your project.

-- 1. Profiles Table (Linked to Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('seller', 'customer')),
  phone TEXT,
  address TEXT,
  usual_quantity_kg NUMERIC(6, 2) DEFAULT 1.0,
  usual_price_per_kg NUMERIC(6, 2) DEFAULT 60.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Linked customer auth account if registered
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  usual_quantity_kg NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  usual_price_per_kg NUMERIC(6, 2) NOT NULL DEFAULT 60.0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Sellers can only see and manage their own dairy customers
CREATE POLICY "Sellers can manage their dairy customers"
  ON public.customers FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

-- Customers can view their own customer record
CREATE POLICY "Customers can view their linked profile"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 3. Deliveries Table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id TEXT PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL DEFAULT '06:30',
  quantity_kg NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  price_per_kg NUMERIC(6, 2) NOT NULL DEFAULT 60.0,
  charge NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_customer_date UNIQUE (customer_id, date)
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage their milk deliveries"
  ON public.deliveries FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

CREATE POLICY "Customers can view their own milk deliveries"
  ON public.deliveries FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL DEFAULT '12:00',
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage their received payments"
  ON public.payments FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

CREATE POLICY "Customers can view their payments"
  ON public.payments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 5. Adjustments Table
CREATE TABLE IF NOT EXISTS public.adjustments (
  id TEXT PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL DEFAULT '00:00',
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage their ledger adjustments"
  ON public.adjustments FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

CREATE POLICY "Customers can view their adjustments"
  ON public.adjustments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Trigger to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, phone, address, usual_quantity_kg)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    COALESCE((NEW.raw_user_meta_data->>'usual_quantity_kg')::numeric, 1.0)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
