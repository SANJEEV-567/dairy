-- ====================================================================
-- DR. SANJAY KUMAR DAIRY - POSTGRESQL & ROW-LEVEL SECURITY (RLS) SCHEMA
-- ====================================================================
-- This script sets up database-level security and strict role-based row isolation.
-- Safe to run repeatedly in the Supabase SQL Editor (100% idempotent).

-- --------------------------------------------------------------------
-- 1. Profiles Table (Linked to Supabase Auth Users)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('seller', 'customer')),
  customer_code TEXT, -- Set if customer links via seller-issued customer code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure customer_code column exists if table was created in an earlier migration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customer_code TEXT;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they already exist before creating
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- --------------------------------------------------------------------
-- 2. Customers Table (Managed by Dairy Seller)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_code TEXT UNIQUE, -- Seller-issued unique code (e.g. DSK-1001)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Explicitly linked customer account
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

-- Ensure columns exist if table was created in earlier version
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_customer_code_key'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);
  END IF;
END $$;

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Sellers can manage their dairy customers" ON public.customers;
CREATE POLICY "Sellers can manage their dairy customers"
  ON public.customers FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

DROP POLICY IF EXISTS "Customers can view their explicitly linked customer record" ON public.customers;
DROP POLICY IF EXISTS "Customers can view their linked profile" ON public.customers;
CREATE POLICY "Customers can view their explicitly linked customer record"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 3. Deliveries Table
-- --------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Sellers can manage their milk deliveries" ON public.deliveries;
CREATE POLICY "Sellers can manage their milk deliveries"
  ON public.deliveries FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

DROP POLICY IF EXISTS "Customers can view only their own milk deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Customers can view their own milk deliveries" ON public.deliveries;
CREATE POLICY "Customers can view only their own milk deliveries"
  ON public.deliveries FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- 4. Payments Table
-- --------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Sellers can manage their received payments" ON public.payments;
CREATE POLICY "Sellers can manage their received payments"
  ON public.payments FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

DROP POLICY IF EXISTS "Customers can view only their own payments" ON public.payments;
DROP POLICY IF EXISTS "Customers can view their payments" ON public.payments;
CREATE POLICY "Customers can view only their own payments"
  ON public.payments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- 5. Adjustments Table
-- --------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Sellers can manage their ledger adjustments" ON public.adjustments;
CREATE POLICY "Sellers can manage their ledger adjustments"
  ON public.adjustments FOR ALL
  USING (auth.uid() = dairy_id)
  WITH CHECK (auth.uid() = dairy_id);

DROP POLICY IF EXISTS "Customers can view only their own adjustments" ON public.adjustments;
DROP POLICY IF EXISTS "Customers can view their adjustments" ON public.adjustments;
CREATE POLICY "Customers can view only their own adjustments"
  ON public.adjustments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- 6. Secure Database Function: Connect Customer Account via Seller-Issued Code
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_customer_account(p_customer_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be signed in to link an account.');
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE UPPER(customer_code) = UPPER(TRIM(p_customer_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid customer code. Please check the code provided by Dr. Sanjay Kumar Dairy.'
    );
  END IF;

  -- Ensure the code is not already linked to a different auth user
  IF v_customer.user_id IS NOT NULL AND v_customer.user_id <> auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'This customer code is already linked to another account. Contact the dairy seller for help.'
    );
  END IF;

  -- Link customer record to current auth user
  UPDATE public.customers
  SET user_id = auth.uid(), updated_at = NOW()
  WHERE id = v_customer.id;

  -- Update profiles table
  UPDATE public.profiles
  SET customer_code = v_customer.customer_code, updated_at = NOW()
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true, 
    'customer_id', v_customer.id, 
    'customer_name', v_customer.name,
    'customer_code', v_customer.customer_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- 7. Trigger to automatically create profile on sign up
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, customer_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
    NEW.raw_user_meta_data->>'customer_code'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    customer_code = COALESCE(EXCLUDED.customer_code, profiles.customer_code),
    updated_at = NOW();

  -- If customer_code was provided at sign up, attempt linking immediately
  IF NEW.raw_user_meta_data->>'customer_code' IS NOT NULL AND 
     NEW.raw_user_meta_data->>'customer_code' <> '' AND 
     NEW.raw_user_meta_data->>'role' = 'customer' THEN
    UPDATE public.customers
    SET user_id = NEW.id, updated_at = NOW()
    WHERE UPPER(customer_code) = UPPER(TRIM(NEW.raw_user_meta_data->>'customer_code'))
      AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
