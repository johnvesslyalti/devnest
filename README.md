# 🚀 DevNest

**DevNest** is a scalable backend platform inspired by **X (Twitter)**, built with **Node.js, TypeScript, NestJS, Prisma, PostgreSQL, and Redis**.

It follows a **modular architecture** and focuses on building **production-ready social platform features** with performance, scalability, and maintainability in mind.

---

## 🧠 Architecture Overview

DevNest follows the standard **NestJS modular architecture** using PostgreSQL as the single source of truth:

```
Module → Controller → Service → Repository (Prisma) → Database (PostgreSQL)
```

### Why this architecture?

- ✅ Clear separation of concerns
- ✅ **Single Source of Truth**: PostgreSQL holds all critical user data (Users, Posts, Comments, Likes, Graph).
- ✅ Modular and scalable
- ✅ Dependency injection for better maintainability
- ✅ **Pull-based Feed**: The home feed is generated on-the-fly by querying posts from followed users, avoiding data duplication.

---

## 📁 Project Structure

```txt
src/
├── auth/             # Authentication module
├── comments/         # Comments module
├── common/           # Shared utilities
├── email/            # Email module (Worker-compatible)
├── feed/             # Feed module
├── generated/        # Generated Prisma client code
├── lib/              # Library & helper functions
├── likes/            # Likes module
├── posts/            # Posts module
├── prisma/           # Prisma service
├── profile/          # User profile management
├── users/            # User management
├── app.module.ts     # Root module
├── main.ts           # Application entry point
├── worker.module.ts  # Worker entry module
└── worker.ts         # Worker entry point

prisma/
└── postgres/         # PostgreSQL schema & migrations
    └── schema.prisma
```

---

## 🛠️ Tech Stack

- **Node.js** & **TypeScript**
- **NestJS** (Backend Framework)
- **Node.js Clustering & Worker Threads** (Horizontal scaling & async bcrypt operations via `piscina`)
- **Prisma ORM** (Database Access)
- **PostgreSQL** (Relational Database)
- **Redis** (Caching & Queues)
- **BullMQ** (Background Jobs & Queues)
- **Authentication** (JWT, Refresh Token Rotation, Google OAuth 2.0, Privacy Hashing)
- **Testing & Performance** (Jest for E2E, k6 for Load Testing)
- **Code Quality** (ESLint Flat Config & Prettier)
- **Dockerization** (Docker Compose for full environment)

---

## 🛡️ Security & Privacy

DevNest implements advanced security and privacy features:

### 🔐 Authentication & Security

- **Robust Token Generation**: Refresh tokens include a **unique UUID (`tokenId`)** in the payload to prevent collisions during rapid authentication requests.
- **Refresh Token Rotation**: Each time a token is refreshed, a new one is issued, and the old one is revoked. Reuse of an old token triggers a **chain revocation** for security.
- **Device Tracking**: We log `IP Address` and `User-Agent` for each login to detect suspicious activity.
- **IP Privacy**: All IP addresses are **hashed (SHA-256)** before storage to protect user privacy.

### 🗑️ Data Management

- **Soft Deletes**: User accounts are soft-deleted (`deletedAt` timestamp). This action **instantly revokes all active sessions** (Refresh Tokens) and prevents further logins.
- **Cascade Revocation**: Deleting an account or detecting token reuse instantly invalidates all associated tokens.

---

## ⚙️ Setup & Installation

### 📋 Prerequisites

- **Node.js** (v18+ recommended)
- **Docker** & **Docker Compose** (for easy database setup)
- **Git**

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/johnvesslyalti/dev-nest.git
cd dev-nest
```

### 2️⃣ Configure Environment Variables

Create a `.env` file in the root directory (you can use `.env.example` as a template):

```env
# PostgreSQL
POSTGRES_URL=postgresql://postgres:password123@localhost:5432/devnest?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Auth
ACCESS_SECRET=your_access_secret
REFRESH_SECRET=your_refresh_secret
PORT=3000
```

### 3️⃣ Start Infrastructure (Docker)

You can spin up the PostgreSQL, Redis, and Background Worker instances utilizing the provided `docker-compose.yml`:

```bash
docker-compose up postgres redis worker -d
```
*(Optionally, you can run the entire system inside Docker with `docker-compose up -d`)*

### 4️⃣ Backend Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Database Setup**

   Generate the Prisma client:

   ```bash
   npm run generate
   ```

   Run migrations to set up the database schema:

   ```bash
   npm run migrate:pg
   ```

3. **Start the Backend**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm run start:prod
   ```

   Server defaults to `http://localhost:3000/api/v1`.

4. **Start the Background Worker (Optional but recommended)**
   The worker handles background jobs such as sending emails.

   ```bash
   # Development mode
   npm run start:worker:dev
   
   # Production mode
   npm run build # (if not already built)
   npm run start:worker
   ```

### 🧪 Verifying the Backend

DevNest includes comprehensive tests.

#### 1️⃣ Run E2E Tests (Jest)

Ensure your test databases are correctly configured, then run:

```bash
# Run all E2E tests
npm run test:e2e

# Run with coverage report
npm run test:e2e:cov
```

#### 2️⃣ Manual API Verification

1. **Ensure the backend is running** (`npm run dev`).
2. **Run the manual functional test**:

   ```bash
   npm run test:manual
   ```
   **Expected Output**: `✅ All tests passed successfully!`

3. **Verify Authentication**:
   ```bash
   npm run test:auth
   ```

### 🚀 Performance & Load Testing

DevNest is highly optimized to handle high concurrency and offload heavy CPU-bound tasks.

1. **Worker Threads**: `bcrypt` password hashing is entirely offloaded to a `piscina` worker pool.
2. **Horizontal Scaling**: The API leverages the Node.js `cluster` module to fork instances across cores.
3. **Database Connection Pooling**: Prisma connections are strictly regulated per-instance to prevent PostgreSQL connection exhaustion.

To run the load tests locally (ensure `k6` is installed):
```bash
k6 run k6-scenario-test.js
```

## 🔄 CI/CD

This repository now includes GitHub Actions workflows for both validation and release automation:

- `CI` runs on pull requests and branch pushes. It provisions PostgreSQL and Redis, installs dependencies, validates Prisma, lints the codebase, builds the app, applies committed migrations, and runs the Jest E2E suite.
- The CI pipeline uses a dedicated `test:e2e:ci` command so GitHub Actions exits cleanly even if local Jest leaves a residual open-handle warning during teardown.
- `CD` runs on pushes to `main` and publishes a production Docker image to GitHub Container Registry at `ghcr.io/<owner>/dev-nest`.

### Container Publishing Notes

- The `CD` workflow uses the built-in `GITHUB_TOKEN`, so no extra registry secret is required for publishing to GHCR.
- If you want to deploy the pushed image to a server or cloud platform afterward, we can add a second deploy job once the target environment is chosen.

---

## 🧪 Development Principles

- ✅ **Modules**: Feature-based separation.
- ✅ **DTOs**: Strict input validation using `class-validator`.
- ✅ **Guards**: Role-based and auth-based access control.
- ✅ **Prisma**: Type-safe database queries.
- ✅ **Prettier/ESLint**: Consistent code style.
- ✅ **Cursor Pagination**: Keyset pagination implemented for efficient list rendering (e.g., Feed).

---

## 👨‍💻 Author

**Johnvessly Alti**
Backend-focused Software Engineer
Building scalable systems with clean architecture.

---

## 📄 License

MIT License
