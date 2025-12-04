### This repository contains the final project for the COMP2140 Group 3 Thursday 9-11am stream

# eTuckShop

A modern web-based tuck shop management system built with Next.js 16 and Firebase. The application supports multiple user roles (Customer, Employee, Owner) with role-specific dashboards and features.

## Deployed on Vercel: [eTuckShop](https://e-tuck-shop.vercel.app/)


**NB**:  Sign up will only allow customer account creation for security purposes. 
> For the sake of this project it is assumed that the tuckshop owner will have their own 'Owner' account as well as a set amount of 'Employee' accounts premade by the administrators as enabling the 'Owner' or 'Employee' role to be selected upon account creation is a security risk.

To access Owner/ Employee role views, use the credentials below:

``` bash
# Owner
Email: owner123@gmail.com
Password: "owner123@gmail.com"

# Employee
Email: employee@gmail.com
Password: "employee@gmail.com"

# Customer
Email: customer123@gmail.com
Password: "customer123@gmail.com"
```



## Features

### Customer Features
- 🛒 Browse menu and add items to cart
- 📦 Place orders and track order status
- 💳 Multiple payment methods (Cash, Debit, Credit)
- 🧾 Receipt generation and download
- 🔔 Real-time notifications for order updates

### Employee Features
- 📋 View and manage incoming orders
- ✅ Update order status (Pending → In Progress → Completed)
- 📦 Inventory management
- 🔔 Notifications for new orders and low stock alerts

### Owner Features
- 📊 Sales and item reports with date filtering
- 📦 Full inventory management (add, edit, delete items)
- 📋 Complete order management
- 👥 Access to all employee features
- 📈 CSV export for reports

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Authentication:** Firebase Auth with session cookies
- **Database:** Firebase Firestore
- **Styling:** CSS Modules
- **Notifications:** react-hot-toast

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── inventory/    # Inventory CRUD operations
│   │   ├── orders/       # Order management
│   │   ├── reports/      # Sales & item reports
│   │   ├── session/      # Auth session management
│   │   └── users/        # User management
│   ├── customer/         # Customer pages
│   │   ├── billing/      # Payment & receipts
│   │   ├── home/         # Customer dashboard
│   │   ├── menu/         # Browse & order items
│   │   └── orders/       # Order history
│   ├── employee/         # Employee pages
│   │   ├── home/         # Employee dashboard
│   │   ├── inventory/    # Stock management
│   │   └── orders/       # Order processing
│   └── owner/            # Owner pages
│       ├── home/         # Owner dashboard
│       ├── inventory/    # Full inventory control
│       ├── orders/       # All orders view
│       └── reports/      # Report generation
├── components/           # Reusable components
├── context/              # React contexts (Auth, Cart, Menu, Notifications)
├── firebase/             # Firebase configuration
├── hooks/                # Custom React hooks
├── styles/               # CSS modules
└── util/                 # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Creating Users

Use the create-user script to add users to Firebase:

```bash
npm run create-user
```

## User Roles

| Role | Access |
|------|--------|
| **Customer** | Menu, Cart, Orders, Billing |
| **Employee** | Orders Management, Inventory View |
| **Owner** | Full Access + Reports |

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/orders` | GET, POST, PUT, DELETE | Order management |
| `/api/inventory` | GET, POST, PUT | Inventory operations |
| `/api/inventory/[itemId]` | DELETE | Delete inventory item |
| `/api/reports/sales` | GET | Sales report data |
| `/api/reports/items` | GET | Item report data |
| `/api/session` | POST, DELETE | Session management |
| `/api/users` | GET | User information |

## License

This project is private and proprietary.
