-- TripSpot Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Spots table
create type spot_category as enum ('cafe', 'restaurant', 'attraction', 'hotel', 'bar', 'other');
create type source_platform as enum ('tiktok', 'instagram', 'manual');

create table if not exists public.spots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  country text not null,
  category spot_category default 'other',
  description text,
  image_url text,
  rating double precision,
  review_count integer,
  source_url text,
  source_platform source_platform default 'manual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trips table
create table if not exists public.trips (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  destination text not null,
  cover_image_url text,
  start_date date,
  end_date date,
  duration_days integer default 1,
  share_token text unique,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trip Stops table (junction table between trips and spots)
create table if not exists public.trip_stops (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips on delete cascade not null,
  spot_id uuid references public.spots on delete cascade not null,
  day_number integer not null,
  order_in_day integer not null,
  notes text,
  scheduled_time time
);

-- Travel Guides table (curated content)
create table if not exists public.travel_guides (
  id uuid default uuid_generate_v4() primary key,
  city text not null,
  country text not null,
  name text not null,
  cover_image_url text,
  spot_count integer default 0,
  is_featured boolean default false
);

-- Create indexes for better query performance
create index if not exists spots_user_id_idx on public.spots(user_id);
create index if not exists spots_country_idx on public.spots(country);
create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_share_token_idx on public.trips(share_token);
create index if not exists trip_stops_trip_id_idx on public.trip_stops(trip_id);
create index if not exists travel_guides_is_featured_idx on public.travel_guides(is_featured);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.spots enable row level security;
alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.travel_guides enable row level security;

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Spots policies
create policy "Users can view their own spots"
  on public.spots for select
  using (auth.uid() = user_id);

create policy "Users can create their own spots"
  on public.spots for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own spots"
  on public.spots for update
  using (auth.uid() = user_id);

create policy "Users can delete their own spots"
  on public.spots for delete
  using (auth.uid() = user_id);

-- Trips policies
create policy "Users can view their own trips"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "Anyone can view public trips"
  on public.trips for select
  using (is_public = true);

create policy "Users can create their own trips"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trips"
  on public.trips for update
  using (auth.uid() = user_id);

create policy "Users can delete their own trips"
  on public.trips for delete
  using (auth.uid() = user_id);

-- Trip Stops policies
create policy "Users can view trip stops for their trips"
  on public.trip_stops for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
    )
  );

create policy "Anyone can view trip stops for public trips"
  on public.trip_stops for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.is_public = true
    )
  );

create policy "Users can manage trip stops for their trips"
  on public.trip_stops for all
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
    )
  );

-- Travel Guides policies (public read access)
create policy "Anyone can view travel guides"
  on public.travel_guides for select
  using (true);

-- Function to automatically create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insert some sample travel guides
insert into public.travel_guides (city, country, name, cover_image_url, spot_count, is_featured) values
  ('Paris', 'France', 'Hidden Gems of Paris', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400', 12, true),
  ('Tokyo', 'Japan', 'Best Cafes in Tokyo', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400', 8, true),
  ('Barcelona', 'Spain', 'Barcelona Food Tour', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400', 15, true),
  ('New York', 'USA', 'NYC Instagram Spots', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400', 20, true),
  ('London', 'UK', 'London Hidden Gems', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400', 10, true)
on conflict do nothing;
