# Todo App - Project Specification

> **Version:** 1.2.0  
> **Last Updated:** 2026-03-10  
> **Status:** Active Development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [API Specification](#4-api-specification)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Component Specification](#6-component-specification)
7. [Pages Specification](#7-pages-specification)
8. [Real-time & PWA](#8-real-time--pwa)
9. [Mobile Responsiveness](#9-mobile-responsiveness)
10. [Future Extensibility](#10-future-extensibility)

---

## 1. Project Overview

| Attribute | Value |
|-----------|-------|
| **Project Name** | Todo App |
| **Type** | Cross-platform Kanban Task Management Application |
| **Core Features** | Task CRUD, Projects/Categories, Priority Levels, Due Dates/Times, Task Reminders (Web Push), Labels, Subtasks, Kanban Board, Today/Calendar Views |
| **Target Users** | Individual users managing personal tasks |
| **Platform** | Web (PWA), Mobile Browser, Desktop Browser |

---

## 2. Tech Stack

### Backend
| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 20.x LTS |
| Framework | Express.js | 4.x |
| Database | PostgreSQL | 16.x |
| ORM | Prisma | 5.x |
| Authentication | JWT + Passport.js | - |
| WebSocket | Socket.io | 4.x |
| Validation | Zod | 3.x |
| Password Hashing | bcrypt | 5.x |
| Push Notifications | web-push | 3.x |
| CRON Jobs | node-cron | 3.x |

### Frontend
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Routing | React Router | 6.x |
| State Management | React Context + useReducer | - |
| HTTP Client | Axios | 1.x |
| WebSocket Client | Socket.io-client | 4.x |
| Drag & Drop | @dnd-kit | 6.x |
| UI Framework | Tailwind CSS | 3.x |
| Date Handling | date-fns | 3.x |
| Icons | Lucide React | - |
| PWA | vite-plugin-pwa | - |

### Development Tools
| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | PostgreSQL database |
| concurrently | Run backend/frontend simultaneously |
| TypeScript | (Optional - using JavaScript for simplicity) |

---

## 3. Database Schema

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  projects    │       │    tasks     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ id (PK)      │◄──────│ id (PK)      │
│ email        │       │ user_id (FK) │       │ project_id   │
│ password     │       │ name         │       │ parent_id    │
│ name         │       │ color        │       │ user_id      │
│ avatar_url   │       │ position     │       │ title        │
│ provider     │       │ created_at   │       │ description  │
│ theme        │       │ updated_at   │       │ due_date     │
│ created_at   │       └──────────────┘       │ priority     │
│ updated_at   │              ▲               │ status       │
└──────┬───────┘              │               │ position     │
       │               ┌──────┴───────┐       │ created_at   │
       │               │    labels    │       │ updated_at   │
       │               ├──────────────┤       └──────┬───────┘
       │               │ id (PK)      │              │
       └──────────────►│ user_id (FK) │◄─────────────┘
                       │ name         │
                       │ color        │
                       └──────────────┘
                               │
                      ┌────────┴────────┐
                      │ notifications   │
                      ├─────────────────┤
                      │ id (PK)         │
                      │ user_id (FK)    │
                      │ type            │
                      │ title           │
                      │ message         │
                      │ data (JSONB)    │
                      │ read            │
                      │ created_at      │
                      └─────────────────┘
```

### Table Definitions

#### 3.1 users
```sql
CREATE TABLE users (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255)    UNIQUE NOT NULL,
  password      VARCHAR(255),              -- NULL for OAuth users
  name          VARCHAR(100)   NOT NULL,
  avatar_url    VARCHAR(500),
  provider      VARCHAR(20)    DEFAULT 'email',  -- 'email', 'google', 'github'
  provider_id   VARCHAR(255),              -- OAuth provider ID
  theme         VARCHAR(10)    DEFAULT 'system', -- 'light', 'dark', 'system'
  default_reminder_minutes INTEGER DEFAULT 30,
  default_reminder_time VARCHAR(5) DEFAULT '09:00',
  push_enabled  BOOLEAN        DEFAULT false,
  created_at    TIMESTAMP      DEFAULT NOW(),
  updated_at    TIMESTAMP      DEFAULT NOW()
);
```

#### 3.2 projects
```sql
CREATE TABLE projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(7)   DEFAULT '#3b82f6',  -- Hex color
  position    INTEGER      DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);
```

#### 3.3 tasks
```sql
CREATE TABLE tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   UUID        REFERENCES tasks(id) ON DELETE CASCADE,  -- Self-reference for subtasks
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  due_date      TIMESTAMP,
  due_time      VARCHAR(5),        -- 'HH:mm'
  priority      VARCHAR(10)  DEFAULT 'medium',  -- 'low', 'medium', 'high'
  status        VARCHAR(20)  DEFAULT 'todo',    -- 'todo', 'in_progress', 'done'
  position      INTEGER      DEFAULT 0,         -- For Kanban ordering
  reminder_enabled BOOLEAN   DEFAULT true,
  reminder_at   TIMESTAMP,
  is_reminder_customized BOOLEAN DEFAULT false,
  reminded_at   TIMESTAMP,
  created_at    TIMESTAMP    DEFAULT NOW(),
  updated_at    TIMESTAMP    DEFAULT NOW()
);
```

**Derived Field:** `is_subtask` = `parent_id IS NOT NULL`

#### 3.4 labels
```sql
CREATE TABLE labels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  color       VARCHAR(7)  DEFAULT '#64748b',
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW()
);

-- Junction table for many-to-many relationship
CREATE TABLE task_labels (
  task_id     UUID        REFERENCES tasks(id) ON DELETE CASCADE,
  label_id    UUID        REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
```

#### 3.5 notifications
```sql
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,  -- 'task_assigned', 'task_due', 'task_completed'
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  data        JSONB,                 -- { taskId, projectId, etc. }
  read        BOOLEAN   DEFAULT false,
  read_at     TIMESTAMP,
  is_archived BOOLEAN   DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3.6 push_subscriptions
CREATE TABLE push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT        UNIQUE NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread 
ON notifications(user_id, read) WHERE read = false;
```

---

## 4. API Specification

### Base URL
```
Development: http://localhost:5000/api
Production: https://api.todoapp.com/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/auth/register` | Register with email/password | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/oauth/:provider` | OAuth login (Google/GitHub) | No |
| GET | `/auth/me` | Get current user | Yes |
| PUT | `/auth/profile` | Update profile | Yes |
| PUT | `/auth/theme` | Update theme preference | Yes |
| PUT | `/auth/preferences` | Update notification preferences | Yes |
| POST | `/auth/logout` | Logout | Yes |

### Project Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/projects` | List all user's projects | Yes |
| POST | `/projects` | Create project | Yes |
| GET | `/projects/:id` | Get single project | Yes |
| PUT | `/projects/:id` | Update project | Yes |
| DELETE | `/projects/:id` | Delete project | Yes |
| PUT | `/projects/reorder` | Reorder projects | Yes |

### Task Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/tasks` | Get all tasks (supports `filter=today`) | Yes |
| GET | `/tasks/project/:projectId` | Get all tasks in project | Yes |
| POST | `/tasks/project/:projectId` | Create task | Yes |
| GET | `/tasks/:id` | Get single task | Yes |
| PUT | `/tasks/:id` | Update task | Yes |
| DELETE | `/tasks/:id` | Delete task | Yes |
| PUT | `/tasks/:id/move` | Move task (status/position) | Yes |
| PUT | `/tasks/reorder` | Reorder multiple tasks (bulk) | Yes |
| POST | `/tasks/:id/subtasks` | Add subtask | Yes |
| PUT | `/tasks/subtasks/:id` | Update subtask | Yes |
| DELETE | `/tasks/subtasks/:id` | Delete subtask | Yes |

### Label Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/labels` | List all user's labels | Yes |
| POST | `/labels` | Create label | Yes |
| PUT | `/labels/:id` | Update label | Yes |
| DELETE | `/labels/:id` | Delete label | Yes |

### Notification Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/notifications` | Get all notifications | Yes |
| GET | `/notifications/unread` | Get unread notifications | Yes |
| GET | `/notifications/count` | Get unread count | Yes |
| PUT | `/notifications/:id/read` | Mark as read | Yes |
| PUT | `/notifications/:id/toggle-read` | Toggle read status | Yes |
| PUT | `/notifications/:id/archive` | Archive notification | Yes |
| PUT | `/notifications/read-all` | Mark all as read | Yes |

### Push Notification Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/notifications/vapid-public-key` | Get public VAPID key | Yes |
| POST | `/notifications/subscribe` | Subscribe to push | Yes |
| DELETE | `/notifications/unsubscribe` | Unsubscribe from push | Yes |
| GET | `/health` | Server health check | No |

### WebSocket Events

#### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join:project` | `{ projectId }` | Join project room for real-time updates |
| `leave:project` | `{ projectId }` | Leave project room |

#### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `task:created` | `{ task }` | New task created |
| `task:updated` | `{ task }` | Task updated |
| `task:deleted` | `{ taskId }` | Task deleted |
| `task:moved` | `{ taskId, status, position }` | Task moved in Kanban |
| `notification:new` | `{ notification }` | New notification |

### Request/Response Formats

#### Task Object
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "parentId": "uuid|null",
  "title": "string",
  "description": "string|null",
  "dueDate": "ISO8601|null",
  "priority": "low|medium|high",
  "status": "todo|in_progress|done",
  "position": 0,
  "subtasks": [],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## 5. Frontend Architecture

### Directory Structure

```
client/
├── public/
│   ├── index.html
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # PWA icons (192x192, 512x512)
├── src/
│   ├── components/
│   │   ├── common/            # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── DatePicker.jsx
│   │   │   └── Badge.jsx
│   │   ├── layout/            # Layout components
│   │   │   ├── AppLayout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── MobileNav.jsx
│   │   ├── kanban/            # Kanban board components
│   │   │   ├── KanbanBoard.jsx
│   │   │   ├── KanbanColumn.jsx
│   │   │   └── TaskCard.jsx
│   │   └── task/              # Task-related components
│   │       ├── TaskModal.jsx
│   │       ├── TaskForm.jsx
│   │       ├── SubtaskList.jsx
│   │       ├── SubtaskItem.jsx
│   │       └── TaskHeader.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx      # Main tasks overview
│   │   ├── ProjectView.jsx    # Single project Kanban
│   │   ├── TodayView.jsx      # Tasks due today
│   │   ├── CalendarView.jsx   # Monthly calendar view
│   │   └── Settings.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   ├── ProjectContext.jsx
│   │   ├── TaskContext.jsx
│   │   ├── LabelContext.jsx   # Labels state
│   │   └── SocketContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useTheme.js
│   │   ├── useProjects.js
│   │   ├── useTasks.js
│   │   └── useSocket.js
│   ├── services/
│   │   ├── api.js             # Axios instance
│   │   ├── authService.js
│   │   ├── projectService.js
│   │   ├── taskService.js
│   │   └── socketService.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── cn.js              # classnames utility
│   ├── styles/
│   │   └── globals.css        # Tailwind imports + custom CSS
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

### Backend Directory Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.js              # Prisma client
│   ├── models/                # (Optional) Business logic models
│   │   └── prisma/            # Prisma queries
│   │       ├── user.js
│   │       ├── project.js
│   │       └── task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── labels.js
│   │   └── notifications.js
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   ├── errorHandler.js
│   │   └── validate.js        # Zod validation
│   ├── services/
│   │   ├── websocket.js      # Socket.io setup
│   │   ├── authService.js
│   │   └── notificationService.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── helpers.js
│   ├── validators/
│   │   ├── authValidator.js
│   │   ├── projectValidator.js
│   │   └── taskValidator.js
│   └── index.js               # Entry point
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── package.json
└── .env.example
```

---

## 6. Component Specification

### 6.1 Common Components

#### Button
- **Variants:** `primary`, `secondary`, `ghost`, `danger`
- **Sizes:** `sm` (32px), `md` (40px), `lg` (48px)
- **States:** default, hover, active, disabled, loading
- **Props:** `variant`, `size`, `disabled`, `loading`, `onClick`, `children`

#### Input
- **Types:** text, email, password
- **Features:** label, placeholder, error message, icon prefix
- **Props:** `label`, `error`, `icon`, `type`, `value`, `onChange`

#### Modal
- **Features:** 
  - Backdrop click to close
  - Escape key to close
  - Scrollable content
  - Close button
  - Mobile: Bottom sheet on mobile (< 640px)
- **Props:** `isOpen`, `onClose`, `title`, `children`, `size`

#### Badge (Priority)
- **Variants:** 
  - High: Red background (`#ef4444`)
  - Medium: Yellow background (`#eab308`)
  - Low: Green background (`#22c55e`)
- **Props:** `priority`, `size`

#### DatePicker
- **Features:**
  - Calendar dropdown
  - Quick options: Today, Tomorrow, Next Week
  - Clear date option
- **Props:** `value`, `onChange`, `minDate`

### 6.2 Layout Components

#### AppLayout
- **Desktop:** Sidebar (240px) + Main Content
- **Mobile:** Collapsible sidebar (hamburger), bottom navigation
- **Responsive:** Breakpoint at 1024px

#### Sidebar
- **Width:** 240px (desktop), full-width drawer (mobile)
- **Contents:**
  - App logo/name
  - Project list (scrollable)
  - "Add Project" button
  - Settings link
  - User profile section
- **Interactions:**
  - Click project to navigate
  - Right-click project for context menu (edit/delete)
  - Drag to reorder projects

#### Header
- **Contents:**
  - Mobile: Hamburger menu + Project name
  - Desktop: Breadcrumb + Search bar + Theme toggle + User menu
- **Height:** 56px

#### MobileNav (Mobile Only)
- **Position:** Fixed bottom
- **Items:** Home, Projects, Add Task, Notifications, Profile

### 6.3 Kanban Components

#### KanbanBoard
- **Layout:** Horizontal scroll container with columns
- **Columns:** To Do, In Progress, Done (customizable)
- **Features:**
  - Drag and drop between columns
  - Drag to reorder within column
  - Scroll horizontally on mobile
  - Swipe to change status (Mobile)
- **Props:** `projectId`, `tasks`, `allowReordering`, `showProject`

#### KanbanColumn
- **Header:** Column name + task count
- **Footer:** "Add task" button
- **Features:**
  - Drop zone for tasks
  - Collapse/expand (optional)
  - Color indicator
- **Props:** `status`, `title`, `tasks`, `onDrop`, `onAddTask`

#### TaskCard
- **Display:**
  - Title (truncated to 2 lines)
  - Priority badge (colored dot)
  - Due date (if set, red if overdue)
  - Subtask progress (e.g., "2/4")
  - Labels visualization
- **Interactions:**
  - Click to open TaskModal
  - Drag handle (Desktop)
  - Quick actions on hover (complete, delete)
  - Scale down and tilt effect during drag
- **Props:** `task`, `onClick`, `onComplete`, `onDelete`, `allowReordering`, `showProject`

### 6.4 Task Components

#### TaskModal
- **Layout:** Modal with form
- **Sections:**
  - Header: Title input, close button
  - Body: Description, due date, priority, subtasks
  - Footer: Cancel, Save buttons
- **Mobile:** Full-screen bottom sheet
- **Props:** `task`, `isOpen`, `onClose`, `onSave`

#### TaskForm
- **Fields:**
  - Title (required)
  - Description (textarea)
  - Due Date (date picker)
  - Priority (select: Low, Medium, High)
  - Project (select - if accessible from multiple projects)
- **Validation:** Title required, max 255 chars

#### SubtaskList
- **Display:** Indented list under main task
- **Features:**
  - Checkbox for completion
  - Add new subtask
  - Delete subtask
  - Reorder subtasks
- **Progress:** "X/Y completed" indicator
- **Props:** `subtasks`, `onAdd`, `onUpdate`, `onDelete`, `onReorder`

#### SubtaskItem
- **Display:** Checkbox + title + actions
- **Interactions:**
  - Toggle complete
  - Click to edit inline
  - Delete button on hover

---

## 7. Pages Specification

### 7.1 Login Page (`/login`)

**Layout:**
- Centered card (max-width: 400px)
- Logo at top
- Form: Email, Password
- "Login" button
- "Register" link
- OAuth buttons: Google, GitHub

**Validation:**
- Email: Required, valid format
- Password: Required, min 6 chars

### 7.2 Register Page (`/register`)

**Layout:**
- Centered card (max-width: 400px)
- Form: Name, Email, Password, Confirm Password
- "Register" button
- "Login" link

**Validation:**
- Name: Required, 2-100 chars
- Email: Required, valid format
- Password: Required, min 6 chars
- Confirm: Must match

### 7.3 Dashboard (`/dashboard`)

**Layout:**
- Overview of all pending tasks across projects.
- Grouped by Status (Kanban) or List view.

### 7.4 Today View (`/today`)

**Layout:**
- Focus on tasks due today or overdue.
- Simplified list view with quick-complete.
- Filtering: Only show past-due activities with status 'To Do' or 'In Progress'.
- Reordering: Disabled (`allowReordering={false}`) to maintain project-specific order.

### 7.5 Project View (`/projects/:id`)

**Layout:**
- Full Kanban board for a specific project.
- Project header with name, color, menu.
- 3 columns: To Do, In Progress, Done.

**Features:**
- Drag and drop tasks.
- Quick add task to any column.
- Filter by priority (optional).
- Search within project.

### 7.6 Settings Page (`/settings`)

**Sections:**
- **Profile:** Name, Email, Avatar
- **Preferences:** Theme (Light/Dark/System)
- **Notifications & Reminders:**
  - Push Notifications toggle (Web Push registration)
  - Default Task Reminder (minutes before due time)
  - Default Task Time (fallback for tasks without time)
- **Account:** Change password (if email user)
- **Danger Zone:** Delete account

### 7.7 Notifications Page (`/notifications`)

**Layout:**
- Scrollable list of recent notifications.
- Filtering: All, Unread.
- "Mark all as read" action.
- Swipe to archive (Mobile).

**Features:**
- Real-time updates via Socket.io.
- Click notification to navigate to relevant entity (task/project).
- Archive old notifications to keep list clean.

---

## 8. Real-time & PWA

### 8.1 WebSocket Integration

**Connection:**
- Connect on authentication
- Join project rooms on navigation
- Auto-reconnect on disconnect

**Events Handled:**
- Task CRUD updates
- Kanban position changes
- Notification received

**Optimistic Updates:**
- Update UI immediately on action
- Rollback on server error

### 8.2 PWA Configuration

**Manifest (manifest.json):**
```json
{
  "name": "Todo App",
  "short_name": "Todos",
  "description": "Kanban task management",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker:**
- Cache: HTML, CSS, JS, static assets.
- Network-first for API calls.
- Background sync for offline actions.
- Web Push: Handle `push` events to show system notifications.

### 8.3 CRON Jobs (Backend)

| Job | Frequency | Description |
|-----|-----------|-------------|
| **Reminder Job** | Every Minute | Checks for tasks with `reminderAt <= now` and sends push/in-app notifications. |
| **Archival Job** | Daily (Midnight) | Archives read notifications older than 3 days. |

---

## 9. Mobile Responsiveness

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| xs | < 640px | Single column, bottom nav, bottom sheet modals |
| sm | 640px | Same as xs |
| md | 768px | 2 kanban columns visible |
| lg | 1024px | 3 kanban columns + sidebar |
| xl | 1280px | Same as lg with more space |

### Mobile Optimizations

| Feature | Implementation |
|---------|----------------|
| **Navigation** | Bottom tab bar (5 items max) |
| **Sidebar** | Slide-out drawer, hamburger toggle |
| **Modals** | Bottom sheet (90% height) |
| **Kanban** | Horizontal scroll, snap to column |
| **Task Cards** | Larger touch targets (min 44px) |
| **Forms** | Full-width inputs, stacked labels |
| **Drag & Drop** | Touch-friendly, visual feedback |
| **Pull to Refresh** | Standard browser refresh |
| **Keyboard** | Proper focus states, no horizontal scroll |

### Touch Gestures

| Gesture | Action |
|---------|--------|
| Swipe right on task | Mark complete |
| Swipe left on task | Delete (with confirm) |
| Long press on task | Show context menu |
| Pull down | Refresh |
| Pinch | Zoom (disabled for UX) |

---

## 10. Future Extensibility

### Planned Features (Not in Initial Scope)

| Feature | Schema Changes | API Changes | Frontend Changes |
|---------|---------------|-------------|------------------|
| **Labels/Tags** | ✅ Implemented | ✅ Implemented | ✅ Implemented |
| **Recurring Tasks** | Add `recurrence_pattern` column | Cron job + new endpoint | Recurrence picker |
| **Multiple Assignees** | Add `task_assignees` table | New routes | Assignee selector |
| **File Attachments** | Add `attachments` table | File upload endpoint | Attachment list UI |
| **Time Tracking** | Add `time_entries` table | Timer endpoints | Timer component |

### How to Add Features

1. **Database:** Add table/columns via Prisma migration
2. **API:** Add routes in `server/src/routes/`
3. **Services:** Add service methods in `server/src/services/`
4. **Frontend:** Add component in `client/src/components/`
5. **State:** Update Context if needed

---

## 11. Development Workflow

### Running Backend Only
```bash
cd server
npm install
cp .env.example .env
# Configure .env with database URL
npx prisma migrate dev
npx prisma generate
npm run dev
# Backend runs on http://localhost:5000
```

### Running Frontend Only
```bash
cd client
npm install
# Configure API base URL in src/services/api.js
npm run dev
# Frontend runs on http://localhost:5173
```

### Running Both
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

---

## 12. Acceptance Criteria

### Authentication
- [x] User can register with email/password
- [x] User can login with email/password
- [x] User can login with Google OAuth
- [x] User can logout
- [x] Protected routes redirect to login

### Projects
- [x] User can create a project
- [x] User can edit project name/color
- [x] User can delete project (with confirmation)
- [x] User can reorder projects (Drag and Drop)

### Tasks
- [x] User can create a task
- [x] User can edit task details
- [x] User can delete task
- [x] User can set due date
- [x] User can set priority
- [x] User can add subtasks
- [x] User can toggle subtask completion
- [x] User can drag task between columns
- [x] User can reorder tasks within a column (Project View only)
- [x] User can set specific reminder times
- [x] User can toggle push notifications in Settings
- [x] Tasks show red due date when overdue (if not done)
- [x] Mobile-friendly calendar view without excessive scrolling
- [x] "Today" view only shows pending overdue tasks
- [x] User can reorder tasks within column

### UI/UX
- [x] Dark mode works
- [x] Theme persists across sessions
- [x] Mobile responsive layout works
- [x] PWA can be installed

### Real-time
- [x] Changes sync across tabs
- [x] WebSocket reconnects on disconnect

---

## 13. Environment Variables

### Server (.env)
```
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/todoapp?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

---

## 14. Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| SPEC.md | ✅ Complete | This document |
| Backend Setup | ✅ Complete | Express, Prisma, Postgres configured |
| Database Schema | ✅ Complete | Prisma schema and migrations applied |
| Auth API | ✅ Complete | JWT and Google OAuth functional |
| Project API | ✅ Complete | CRUD endpoints working |
| Task API | ✅ Complete | CRUD and drag/drop updates working |
| WebSocket | ✅ Complete | Socket.io real-time sync implemented |
| Frontend Setup | ✅ Complete | Vite, React, Tailwind configured |
| Auth Pages | ✅ Complete | Login and register pages fully functional |
| Kanban Board | ✅ Complete | Drag and drop working with responsive views |
| Task Modal | ✅ Complete | Form handling with subtasks working |
| Dark Mode | ✅ Complete | Tailwind dark mode and context set up |
| Mobile UI | ✅ Complete | Off-canvas drawer and bottom nav implemented |
| PWA | ✅ Complete | vite-plugin-pwa configured |

---

*End of Specification*
