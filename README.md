# Unfazed – Therapy Management Platform

**Unfazed** is a full-stack therapy management platform designed to simplify the way therapists manage their practice and help clients access mental health services.

The platform provides tools for therapist management, client management, appointment scheduling, therapy packages, payments, session notes, analytics, and real-time communication between therapists and clients.

---

## Key Features

### Therapist Features

- Therapist registration and login.
- Secure authentication using JWT.
- Therapist profile management.
- Unique therapist profile slugs.
- Client management and client records.
- Appointment scheduling and availability management.
- Session creation, updating, and cancellation.
- Session notes management.
- Dashboard with practice analytics.
- Real-time chat with clients.
- Payment tracking and management.
- Subscription plan management.

### Client Features

- Client registration and login.
- Secure client authentication.
- Explore available therapists.
- View therapist profiles.
- Book therapy sessions.
- View upcoming and previous sessions.
- Purchase therapy packages.
- Make payments for sessions and packages.
- Access payment history and invoices.
- View session notes.
- Update client profile and intake information.
- Receive notifications.
- Chat with booked therapists through separate conversations.

### Real-Time Chat

- Real-time messaging using Socket.IO.
- Separate chat rooms for each client–therapist pair.
- Clients can communicate with multiple therapists they have booked.
- Therapists can communicate with their clients.
- Message history is stored in MongoDB.
- Real-time notifications.

### Payment Management

- Razorpay payment gateway integration.
- Create payment orders.
- Verify payment transactions.
- Session payment management.
- Therapy package purchases.
- Payment history.

### Therapy Packages

- Five default therapy packages are provided for therapists.
- Therapists can customize package prices and session counts.
- Each therapist has independent package configurations.
- Clients can browse and purchase available packages.

### Subscription Management

Unfazed supports three subscription tiers:

| Plan | Monthly Price |
|---|---:|
| Starter | ₹0 |
| Growth | ₹1,000 |
| Professional | ₹2,000 |

Subscription tiers support plan-based resource limits and feature access.

---

## Technology Stack

### Frontend

- React.js
- Vite
- React Router DOM
- Tailwind CSS
- Axios
- Socket.IO Client
- Lucide React

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JSON Web Tokens (JWT)
- bcryptjs
- Razorpay
- Multer
- Nodemailer
- PDFKit

### Database

- MongoDB Atlas

### Payment Gateway

- Razorpay

### Version Control

- Git
- GitHub

---

## Project Structure

```text
Unfazed/
│
├── Unfazed-frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── profile/
│   │   │   ├── scheduling/
│   │   │   ├── crm/
│   │   │   ├── payments/
│   │   │   ├── notes/
│   │   │   ├── chat/
│   │   │   └── analytics/
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── therapist/
│   │   │   └── client/
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── unfazed-backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
│   │
│   ├── app.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB Atlas account or a local MongoDB instance
- Git
- Razorpay account for payment integration

### 1. Clone the Repository

```bash
git clone https://github.com/ta-nvee/Unfazed.git
```

```bash
cd Unfazed
```

### 2. Backend Setup

Navigate to the backend folder:

```bash
cd unfazed-backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the backend folder and configure the environment variables required by your backend:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Add any additional environment variables required by your email, file upload, or other integrations.

Start the backend:

```bash
npm run dev
```

Backend runs locally at:

```text
http://localhost:5000
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd Unfazed-frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the frontend folder:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Use the exact environment variable names expected by your Axios configuration.

Start the frontend:

```bash
npm run dev
```

Frontend runs locally at:

```text
http://localhost:5173
```

---

## Backend API Modules

The backend is organized into modular routes and controllers.

| Module | Base Route | Description |
|---|---|---|
| Authentication | `/api/auth` | Registration and login |
| Therapists | `/api/therapists` | Therapist profiles |
| Clients | `/api/clients` | Client management |
| Scheduling | `/api/scheduling` | Sessions and availability |
| Leads | `/api/leads` | Lead management |
| Payments | `/api/payments` | Payment processing |
| Notes | `/api/notes` | Session and client notes |
| Analytics | `/api/analytics` | Dashboard analytics |

Additional client portal and package routes support client-side functionality.

---

## Security

- JWT-based authentication.
- Password hashing using bcryptjs.
- Protected backend routes.
- Role-based client and therapist authentication.
- Payment verification through Razorpay.
- Environment variables for sensitive credentials.
- Separate chat rooms for individual client–therapist relationships.

**Important:** Never commit `.env` files, database credentials, JWT secrets, or payment gateway secrets to GitHub.

---

## Deployment

The project is structured for separate frontend and backend deployment.

| Component | Deployment Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |
| Payment Gateway | Razorpay |

Configure production environment variables in the respective deployment dashboards before launching the application.

---

## Project Objective

The main objective of Unfazed is to provide a centralized digital platform for therapists and clients.

It aims to reduce manual administrative work, simplify appointment scheduling, improve client management, streamline payments, and enable convenient communication between therapists and clients.

---

## Future Enhancements

- Video consultation integration.
- Advanced therapist analytics.
- Automated appointment reminders.
- Improved client progress tracking.
- Enhanced reporting and invoice management.
- Additional subscription features.

---

## Developed By

**Tanvi Mandavkar**

Full-Stack Development Internship Project

GitHub: [ta-nvee](https://github.com/ta-nvee)

---

*Unfazed – Making therapy management simpler, more organized, and more connected.*# Unfazed – Therapy Management Platform

**Unfazed** is a full-stack therapy management platform designed to simplify the way therapists manage their practice and help clients access mental health services.

The platform provides tools for therapist management, client management, appointment scheduling, therapy packages, payments, session notes, analytics, and real-time communication between therapists and clients.

---

## Key Features

### Therapist Features

- Therapist registration and login.
- Secure authentication using JWT.
- Therapist profile management.
- Unique therapist profile slugs.
- Client management and client records.
- Appointment scheduling and availability management.
- Session creation, updating, and cancellation.
- Session notes management.
- Dashboard with practice analytics.
- Real-time chat with clients.
- Payment tracking and management.
- Subscription plan management.

### Client Features

- Client registration and login.
- Secure client authentication.
- Explore available therapists.
- View therapist profiles.
- Book therapy sessions.
- View upcoming and previous sessions.
- Purchase therapy packages.
- Make payments for sessions and packages.
- Access payment history and invoices.
- View session notes.
- Update client profile and intake information.
- Receive notifications.
- Chat with booked therapists through separate conversations.

### Real-Time Chat

- Real-time messaging using Socket.IO.
- Separate chat rooms for each client–therapist pair.
- Clients can communicate with multiple therapists they have booked.
- Therapists can communicate with their clients.
- Message history is stored in MongoDB.
- Real-time notifications.

### Payment Management

- Razorpay payment gateway integration.
- Create payment orders.
- Verify payment transactions.
- Session payment management.
- Therapy package purchases.
- Payment history.

### Therapy Packages

- Five default therapy packages are provided for therapists.
- Therapists can customize package prices and session counts.
- Each therapist has independent package configurations.
- Clients can browse and purchase available packages.

### Subscription Management

Unfazed supports three subscription tiers:

| Plan | Monthly Price |
|---|---:|
| Starter | ₹0 |
| Growth | ₹1,000 |
| Professional | ₹2,000 |

Subscription tiers support plan-based resource limits and feature access.

---

## Technology Stack

### Frontend

- React.js
- Vite
- React Router DOM
- Tailwind CSS
- Axios
- Socket.IO Client
- Lucide React

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JSON Web Tokens (JWT)
- bcryptjs
- Razorpay
- Multer
- Nodemailer
- PDFKit

### Database

- MongoDB Atlas

### Payment Gateway

- Razorpay

### Version Control

- Git
- GitHub

---

## Project Structure

```text
Unfazed/
│
├── Unfazed-frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── profile/
│   │   │   ├── scheduling/
│   │   │   ├── crm/
│   │   │   ├── payments/
│   │   │   ├── notes/
│   │   │   ├── chat/
│   │   │   └── analytics/
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── therapist/
│   │   │   └── client/
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── unfazed-backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
│   │
│   ├── app.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB Atlas account or a local MongoDB instance
- Git
- Razorpay account for payment integration

### 1. Clone the Repository

```bash
git clone https://github.com/ta-nvee/Unfazed.git
```

```bash
cd Unfazed
```

### 2. Backend Setup

Navigate to the backend folder:

```bash
cd unfazed-backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the backend folder and configure the environment variables required by your backend:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Add any additional environment variables required by your email, file upload, or other integrations.

Start the backend:

```bash
npm run dev
```

Backend runs locally at:

```text
http://localhost:5000
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd Unfazed-frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the frontend folder:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Use the exact environment variable names expected by your Axios configuration.

Start the frontend:

```bash
npm run dev
```

Frontend runs locally at:

```text
http://localhost:5173
```

---

## Backend API Modules

The backend is organized into modular routes and controllers.

| Module | Base Route | Description |
|---|---|---|
| Authentication | `/api/auth` | Registration and login |
| Therapists | `/api/therapists` | Therapist profiles |
| Clients | `/api/clients` | Client management |
| Scheduling | `/api/scheduling` | Sessions and availability |
| Leads | `/api/leads` | Lead management |
| Payments | `/api/payments` | Payment processing |
| Notes | `/api/notes` | Session and client notes |
| Analytics | `/api/analytics` | Dashboard analytics |

Additional client portal and package routes support client-side functionality.

---

## Security

- JWT-based authentication.
- Password hashing using bcryptjs.
- Protected backend routes.
- Role-based client and therapist authentication.
- Payment verification through Razorpay.
- Environment variables for sensitive credentials.
- Separate chat rooms for individual client–therapist relationships.

**Important:** Never commit `.env` files, database credentials, JWT secrets, or payment gateway secrets to GitHub.

---

## Deployment

The project is structured for separate frontend and backend deployment.

| Component | Deployment Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |
| Payment Gateway | Razorpay |

Configure production environment variables in the respective deployment dashboards before launching the application.

---

## Project Objective

The main objective of Unfazed is to provide a centralized digital platform for therapists and clients.

It aims to reduce manual administrative work, simplify appointment scheduling, improve client management, streamline payments, and enable convenient communication between therapists and clients.

---

## Future Enhancements

- Video consultation integration.
- Advanced therapist analytics.
- Automated appointment reminders.
- Improved client progress tracking.
- Enhanced reporting and invoice management.
- Additional subscription features.

---

## Developed By

**Tanvi Mandavkar**

Full-Stack Development Internship Project

GitHub: [ta-nvee](https://github.com/ta-nvee)

---

*Unfazed – Making therapy management simpler, more organized, and more connected.*
