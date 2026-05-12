# DevNest Architecture (V1)

## Overview

DevNest V1 is a monolithic NestJS application designed for social networking features. It prioritizes simplicity and robust data integrity using PostgreSQL as the single source of truth.

## Core Principles

1.  **Single Source of Truth**: PostgreSQL holds all critical user data (Users, Posts, Comments, Likes, Graph).
2.  **Pull-based Feed**: The home feed is generated on-the-fly by querying posts from followed users. This avoids data duplication and synchronization issues typical of push-based models in early stages.
3.  **Auxiliary Stores**: Redis is treated as auxiliary for caching and queuing (BullMQ) but is not the primary data store.

## Module Boundaries

### 1. Auth Module

- **Responsibility**: User registration, login, session management (JWT + Refresh Tokens).
- **Data**: Owns `User`, `RefreshToken` tables in Postgres.
- **Dependencies**: Uses `EmailModule` for welcome emails.

### 2. Posts Module

- **Responsibility**: Creating, editing, deleting, and retrieving posts.
- **Data**: Owns `Post` table.
- **Interactions**:
  - **Feed**: Posts are passively queried by the Feed module. No active "fan-out" is performed on post creation.

### 3. Feed Module

- **Responsibility**: Aggregating posts for a user's home feed.
- **Pattern**: **Pull Model**.
  - Queries `Post` table where `authorId` is in the current user's `following` list.
  - Ordered by `createdAt` desc.
- **Data Access**: Read-only access to `Post`, `Follow`, `User` tables via Prisma.

### 4. Interaction Modules (Likes, Comments)

- **Responsibility**: handling social interactions.
- **Data**: Owns `Like`, `Comment` tables.

### 5. Profile Module

- **Responsibility**: Managing user profiles and followers.
- **Data**: Manages `Follow` and `BlockedUser` relations.

## Data Ownership Map

| Feature          | Primary Store      | Schema/Table   | Notes                         |
| :--------------- | :----------------- | :------------- | :---------------------------- |
| **Users**        | Postgres           | `User`         | Soft-deletable.               |
| **Auth**         | Postgres           | `RefreshToken` | Rotated on use.               |
| **Posts**        | Postgres           | `Post`         | Indexed by author and date.   |
| **Social Graph** | Postgres           | `Follow`       | Bidirectional relations.      |
| **Feed**         | Postgres           | _(Computed)_   | Derived from Posts + Follows. |

## Infrastructure Support

- **Postgres**: Required. Primary DB.
- **Redis**: Required. Used for BullMQ (background jobs) and Throttling.
