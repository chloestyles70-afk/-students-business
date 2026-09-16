# Students Business MVP

Mobile-first student marketplace using React, Vite and Supabase.

## Features
- Email authentication
- Browse/search/filter active listings
- Listing details
- Create listings
- Buyer order history
- Order creation through the existing `create_order` RPC
- Responsive mobile UI
- No payment gateway in the first MVP

## Environment
Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
Never use a Supabase service-role/secret key in this frontend.

## Run
npm install
npm run dev

## Railway
The included Dockerfile builds the Vite app and serves it with nginx. Set the two VITE variables in Railway before building.
