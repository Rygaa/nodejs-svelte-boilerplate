# Three-Project Setup: Backend + Shared + Frontend

A minimal working setup with three separate projects using separate node_modules (no workspaces).

## Project Structure

```
AIM/
├── backend/           # Node.js + Express + tRPC + Prisma
├── frontend/          # React + Vite + TailwindCSS + tRPC Client
└── shared/            # Shared types (Prisma + tRPC)
```

## Complete Setup Commands

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL running on localhost:5432
- Database `oasis_path_db` with user `postgres` and password `123456`

### 1. Install Dependencies

```powershell
# Backend dependencies
cd backend
npm install

# Shared dependencies
cd ../shared
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```powershell
# Go to backend directory
cd backend

# Generate Prisma client (outputs to ../shared/prisma)
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with sample data
npm run db:seed
```

### 3. Build Shared Types

```powershell
# Build shared package
cd ../shared
npm run build
```

### 4. Run the Applications

**Terminal 1 - Backend:**

```powershell
cd backend
npm run dev
```

Server runs on http://localhost:4000

**Terminal 2 - Frontend:**

```powershell
cd frontend
npm run dev
```

Frontend runs on http://localhost:5173

## API Endpoints

- `GET /trpc/ping` → `{ message: "pong from server" }`
- `GET /trpc/user.list` → Array of users (id, name, email)
- `GET /trpc/project.list` → Array of projects with owner info

## Database Commands

```powershell
cd backend

# Reset database (careful!)
npm run db:reset

# Generate Prisma client after schema changes
npm run db:generate

# Create new migration
npx prisma migrate dev --name your_migration_name

# View data in Prisma Studio
npx prisma studio
```

## Frontend Features

- **Ping Button**: Tests server connectivity
- **Users List**: Displays all users from database
- **Projects List**: Shows projects with owner information
- **Tailwind Styling**: Clean, responsive design

## Tech Stack

**Backend:**

- Node.js + Express
- tRPC for type-safe APIs
- Prisma ORM
- PostgreSQL database
- TypeScript

**Shared:**

- Type definitions
- Prisma client generation
- tRPC router types

**Frontend:**

- React 18
- Vite build tool
- TailwindCSS styling
- tRPC React Query client
- TypeScript
