# Workspace Management Panel

A real-time workspace management panel with admin authentication and direct messaging capabilities.

## Features

- Admin authentication and dashboard
- User registration and login with email authorization
- Real-time direct messaging between users
- User online/offline status
- Modern UI with dark mode support
- Responsive design

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Socket.IO Client
- React Router
- shadcn/ui components

### Backend
- Node.js
- Express
- Socket.IO
- PostgreSQL
- Sequelize ORM
- JWT Authentication

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd workspace-management-panel
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Install frontend dependencies:
```bash
cd ../client
npm install
```

4. Create a `.env` file in the server directory with the following variables:
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASS=your_password
DB_NAME=workspace_db
JWT_SECRET=your_jwt_secret
```

5. Set up the database:
```bash
cd ../server
npm run db:setup
```

## Running the Application

1. Start the backend server:
```bash
cd server
npm run dev
```

2. Start the frontend development server:
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Usage

1. Admin Access:
   - Navigate to `/admin-login`
   - Login with admin credentials
   - Manage authorized users in the admin dashboard

2. User Access:
   - Register with an authorized email at `/register`
   - Login at `/login`
   - Start chatting with other users in the workspace

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 