-- Supabase Row Level Security (RLS) Setup
-- Run this AFTER the database schema is created

BEGIN;

-- ============================================
-- Enable RLS on all user-related tables
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- User Profiles Policies
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()::text
      AND 'ADMIN' = ANY(up.roles)
    )
  );

-- ============================================
-- Creator Profiles Policies
-- ============================================

-- Users can view their own creator profile
CREATE POLICY "Users can view own creator profile"
  ON creator_profiles FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own creator profile
CREATE POLICY "Users can create own creator profile"
  ON creator_profiles FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own creator profile
CREATE POLICY "Users can update own creator profile"
  ON creator_profiles FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ============================================
-- Solutions Policies
-- ============================================

-- Anyone can view published solutions
CREATE POLICY "Anyone can view published solutions"
  ON solutions FOR SELECT
  USING (status = 'PUBLISHED' OR auth.uid()::text = user_id);

-- Creators can create solutions
CREATE POLICY "Creators can create solutions"
  ON solutions FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id AND
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.user_id = auth.uid()::text
      AND cp.status = 'APPROVED'
    )
  );

-- Creators can update their own solutions
CREATE POLICY "Creators can update own solutions"
  ON solutions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Creators can delete their own draft solutions
CREATE POLICY "Creators can delete own draft solutions"
  ON solutions FOR DELETE
  USING (auth.uid()::text = user_id AND status = 'DRAFT');

-- ============================================
-- Solution Files Policies
-- ============================================

-- Users can view files for solutions they have access to
CREATE POLICY "Users can view solution files"
  ON solution_files FOR SELECT
  USING (
    solution_id IN (
      SELECT id FROM solutions
      WHERE status = 'PUBLISHED' OR user_id = auth.uid()::text
    )
  );

-- Users can upload files to their own solutions
CREATE POLICY "Users can upload to own solutions"
  ON solution_files FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()::text AND
    solution_id IN (
      SELECT id FROM solutions WHERE user_id = auth.uid()::text
    )
  );

-- ============================================
-- Orders Policies
-- ============================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own pending orders
CREATE POLICY "Users can update own pending orders"
  ON orders FOR UPDATE
  USING (auth.uid()::text = user_id AND status = 'PENDING');

-- ============================================
-- Reviews Policies
-- ============================================

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

-- Users can create reviews for solutions
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- Favorites Policies
-- ============================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- Cart Policies
-- ============================================

-- Users can view their own cart
CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own cart
CREATE POLICY "Users can create own cart"
  ON carts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own cart
CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ============================================
-- Notifications Policies
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

COMMIT;

-- ============================================
-- Database Functions and Triggers
-- ============================================

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    user_id,
    display_name,
    avatar,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar',
    now(),
    now()
  );
  RETURN new;
END;
$$;

-- Trigger to create user profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON solutions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
