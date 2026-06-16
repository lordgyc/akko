# 🍺 Beer Stock Management App - Setup Guide

## App Overview

This is a **simple purple-themed beer inventory management app** built with Expo and Supabase.

### Features
- 🔐 Login with Supabase Authentication
- 📊 Dashboard to view all inventory items
- ➕ Add new beer items
- ✏️ Update stock quantities and details
- 🗑️ Delete items
- 🎨 Clean, minimal purple UI

---

## Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for it to initialize

### Step 3: Create Database Table

In your Supabase dashboard, go to **SQL Editor** and run this query:

```sql
CREATE TABLE beer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  quantity INT NOT NULL,
  abv FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE beer_items ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write all items
CREATE POLICY "Allow all read access" ON beer_items FOR SELECT USING (true);
CREATE POLICY "Allow all write access" ON beer_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access" ON beer_items FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access" ON beer_items FOR DELETE USING (true);
```

### Step 4: Get Your Credentials

1. Go to **Project Settings** → **API**
2. Copy your:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Key** (the public API key)

### Step 5: Update Supabase Config

Edit `src/config/supabase.ts`:

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### Step 6: Run the App

```bash
npm start
```

Choose how to run:
- Press `i` for iOS simulator
- Press `a` for Android emulator  
- Press `w` for web

---

## Testing the App

### Create a Test Account
1. On the login screen, click "Don't have an account? Sign Up"
2. Enter any email and password (min 6 characters)
3. Click "Create Account"
4. Sign in with those credentials

### Try the Features
- **Dashboard**: See all beer items (empty at first)
- **Add Item**: Click "+ Add Item" button
  - Fill in: Name, Brand, Quantity, ABV%
  - Example: Guinness, Diageo, 5, 4.2
- **Update Stock**: Tap any item to edit or delete it

---

## Project Structure

```
src/
├── app/
│   ├── _layout.tsx              # Main auth routing
│   ├── index.tsx                # Redirect to dashboard
│   ├── login.tsx                # Login/signup screen
│   ├── dashboard.tsx            # Inventory dashboard
│   ├── add-item.tsx             # Add new beer form
│   └── update-stock.tsx         # Edit beer details
├── components/ui/
│   ├── button.tsx               # Reusable buttons
│   └── input-field.tsx          # Reusable input fields
├── config/
│   └── supabase.ts              # Supabase client setup
├── context/
│   └── auth-context.tsx         # Auth state management
├── constants/
│   └── theme.ts                 # Purple color theme
└── hooks/
    └── use-color-scheme.ts      # Dark/light mode hook
```

---

## Customization

### Change Colors
Edit `src/constants/theme.ts`:
```typescript
export const Colors = {
  light: {
    tint: '#6D28D9',  // Change purple to any hex color
    // ... other colors
  },
  // ...
}
```

### Add/Remove Fields
The app stores:
- Name, Brand, Quantity, ABV%

To add fields like price, style, etc.:
1. Add columns to the `beer_items` table in Supabase
2. Update `src/config/supabase.ts` BeerItem interface
3. Add form fields in add-item.tsx and update-stock.tsx

---

## Troubleshooting

### "Failed to authenticate" error
- Check your Supabase URL and Anon Key
- Make sure you copied them correctly (no extra spaces)

### "Failed to fetch items" error
- Make sure the `beer_items` table exists
- Check that RLS policies are enabled
- Verify you're signed in

### Items not saving
- Refresh the dashboard (pull down)
- Check network connection
- Verify Supabase credentials are correct

---

## Next Steps

- Add a search/filter feature
- Implement beer categories (lager, IPA, stout, etc.)
- Add photos of beers
- Create low stock alerts
- Generate inventory reports

Happy brewing! 🍻
