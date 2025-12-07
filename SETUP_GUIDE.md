# Billing App - Setup & Deployment Guide

## 🏠 Local Development Setup

### Prerequisites
- Node.js v18 or higher
- npm or bun package manager
- Git

### Step 1: Clone the Project
```bash
git clone <your-repository-url>
cd <project-folder>
```

### Step 2: Install Dependencies
```bash
npm install
# or
bun install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### Step 4: Run the Development Server
```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

---

## 🗄️ Database Schema Overview

### Tables
| Table | Purpose |
|-------|---------|
| `company_profile` | Company details, logo, GSTIN |
| `customers` | Customer master with credit tracking |
| `invoices` | Sales invoices with GST |
| `invoice_items` | Line items for invoices |
| `dyeing_bills` | Dyeing work bills |
| `dyeing_bill_items` | Line items for dyeing bills |
| `payments` | Payment records |
| `profiles` | User profiles |
| `user_roles` | User role assignments |

### Key Features
- **Row Level Security (RLS)**: All tables have RLS enabled
- **Automatic Timestamps**: `created_at` and `updated_at` managed automatically
- **Credit Tracking**: Customer credit updated on invoice/bill creation/deletion

---

## ☁️ Database Migration to External Cloud

### Option 1: Export to PostgreSQL (AWS RDS, Azure, GCP, etc.)

#### Step 1: Export Schema & Data from Lovable Cloud
Use the Lovable Cloud interface or connect via psql:
```bash
# Connect to your Supabase database
psql "postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Export schema
pg_dump --schema-only -d postgres > schema.sql

# Export data
pg_dump --data-only -d postgres > data.sql
```

#### Step 2: Set Up Target Database
1. Create a PostgreSQL database on your cloud provider
2. Note the connection string

#### Step 3: Import to New Database
```bash
# Import schema first
psql -h [HOST] -U [USER] -d [DATABASE] < schema.sql

# Then import data
psql -h [HOST] -U [USER] -d [DATABASE] < data.sql
```

#### Step 4: Update Environment Variables
Update your `.env` file:
```env
VITE_SUPABASE_URL=https://your-new-api-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-new-key
```

### Option 2: Using Supabase (Self-Hosted or Supabase.com)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string
3. Use pg_dump/pg_restore to migrate data
4. Update environment variables

---

## 🚀 Production Deployment

### Frontend Deployment Options

#### Lovable (Recommended)
1. Click "Publish" button in Lovable
2. Click "Update" to deploy changes
3. Configure custom domain in Settings

#### Vercel
```bash
npm run build
# Deploy dist/ folder to Vercel
```

#### Netlify
```bash
npm run build
# Deploy dist/ folder to Netlify
```

### Backend (Supabase/Edge Functions)
Edge functions deploy automatically with Lovable Cloud.

For external hosting:
1. Set up Supabase CLI
2. Deploy functions: `supabase functions deploy`

---

## 🔒 Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Environment variables not committed to Git
- [ ] HTTPS enabled in production
- [ ] API keys rotated periodically
- [ ] User authentication required for sensitive operations

---

## 📋 Feature Verification Checklist

### Invoices Module
- [ ] Create new invoice with items and GST
- [ ] View invoice with print-ready layout
- [ ] Edit invoice (update functionality)
- [ ] Delete invoice (with customer credit update)
- [ ] Export invoice to Excel
- [ ] Share invoice via WhatsApp
- [ ] E-Way Bill button shows for ≥₹50,000

### Dyeing Bills Module
- [ ] Create new dyeing bill
- [ ] View dyeing bill with print layout
- [ ] Delete dyeing bill
- [ ] Export to Excel
- [ ] Share via WhatsApp

### Customers Module
- [ ] Add new customer with GST validation
- [ ] Edit customer details
- [ ] Delete customer (admin only)
- [ ] Record payments
- [ ] View credit/outstanding balance

### Reports Module
- [ ] Generate date-range reports
- [ ] Filter by customer
- [ ] Export to Excel with all columns
- [ ] Share summary via WhatsApp

### Settings
- [ ] Update company profile
- [ ] Upload company logo
- [ ] Configure invoice/dyeing prefixes

---

## 🐛 Troubleshooting

### Common Issues

**Invoice delete not working**
- Ensure RLS DELETE policy exists on invoices table
- Check browser console for errors

**Data not showing**
- Verify RLS policies allow SELECT
- Check user authentication status

**Excel export missing data**
- Ensure all required fields are fetched in query
- Check for null handling in export function

### Getting Help
- Check browser console (F12) for errors
- Review network requests for API failures
- Verify Supabase dashboard for database issues

---

## 📞 Support

For issues with:
- **Lovable Platform**: [Lovable Docs](https://docs.lovable.dev)
- **Database**: Check Supabase logs in Lovable Cloud
- **Code Issues**: Review console errors and network tab
