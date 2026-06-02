# ⚡ SparkUp — Campus Companionship & Social App

> **A college-exclusive social platform where verified students swipe, match, chat, and connect through shared personality and campus culture.**

SparkUp is a full-stack mobile application built with **React Native (Expo)** and **Supabase**, designed exclusively for college students. It combines personality-driven matchmaking, real-time chat with read receipts, and a rich campus social feed — all in one cohesive, privacy-first experience.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Screen & Navigation Flow](#-screen--navigation-flow)
- [Database Structure](#-database-structure)
- [State Management](#-state-management)
- [Key Algorithms](#-key-algorithms)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [Supabase Configuration](#-supabase-configuration)
- [Future Scope](#-future-scope)

---

## 🌟 Overview

SparkUp solves a core problem for college students: traditional dating apps are noisy, unverified, and lack campus context. SparkUp restricts sign-up to valid **college email addresses** and enriches matching with a **psychometric personality test**, ensuring connections are meaningful and contextually relevant.

The app operates across four key pillars:

| Pillar | Description |
|---|---|
| 🔐 **Verified Access** | Email-domain verification, legal terms, and age gate |
| 💘 **Smart Matching** | Personality-driven cosine-similarity scoring |
| 💬 **Real-time Chat** | WhatsApp-style messaging with delivery and read receipts |
| 📢 **Campus Feed** | Posts, polls, events, and announcements for the campus community |

---

## ✨ Features

### 🔐 Authentication & Onboarding

- **Email/Password sign-up & sign-in** via Supabase Auth
- **College domain auto-detection** — the email domain is extracted and stored as `university_domain` to scope users to their campus
- **Legal Disclaimer & Age Gate** — a mandatory Terms & Conditions screen that requires users to scroll to the bottom before the "Accept" button becomes active, ensuring informed consent (age 18+)
- **Profile Setup** — name, bio, and avatar photo upload to Supabase Storage (`avatars` bucket), with base64/blob handling for cross-platform compatibility
- **Personality Test** — 10-question psychometric questionnaire with four personality archetypes (see [Key Algorithms](#-key-algorithms))

### 💘 Discover (Swiping)

- **Tinder-style card deck** with gesture-based swiping (left = reject, right = like, star button = super-like)
- **LIKE / NOPE stamps** that fade in as the card is dragged
- **Next card pre-rendered** behind the current card for a seamless stack feel
- **Animated action buttons** (X, ⭐, ❤️) with spring micro-animations on press
- **Compatibility score badge** on every card, computed from personality answer vectors using cosine similarity
- **Online presence indicator** — "Active now" badge when the user has been seen within the last 5 minutes
- **Review Mode** — users can revisit and reconsider profiles they previously rejected
- **Optimistic UI** — the card advances immediately while the database write fires in the background, keeping interactions snappy
- **Mutual match detection** — if both users swipe right on each other, a `MatchModal` is triggered

### 💬 Chats

- **Match inbox** showing all mutual matches, sorted by unread messages first, then by latest message time
- **Active Sparks row** — horizontal avatar scroll at the top with real-time compatibility percentage badge
- **Unread badge** — bold name, colored timestamp, and a blue pill showing the unread message count
- **Real-time updates** via Supabase Realtime (Postgres changes on `matches` and `messages` tables)
- **Pull-to-refresh** support

### 💬 Chat Detail (ChatDetailScreen)

- **Optimistic message sending** — message appears instantly before the DB write confirms
- **Read receipts (tick system)**:
  - ⬜ Single grey tick → `sent` (in transit or pending)
  - 🔵 Blue double tick → `read` (other user opened the chat)
- **Auto-mark as read** — when a user opens a chat, all unread messages from the other person are immediately updated to `read` in the DB, and the sender sees blue ticks in real-time via Supabase Realtime subscription
- **Online/Offline status** in the chat header
- **Keyboard-aware layout** (`KeyboardAvoidingView`) for iOS and Android

### 📢 Campus Feed (PostsScreen)

A full social feed scoped to the campus community, with four post types:

| Type | Colour | Description |
|---|---|---|
| 📝 **Text Post** | Indigo | Standard rich-text post |
| 📊 **Poll** | Amber | Anonymous/multi-select polls with live vote percentages |
| 📅 **Event** | Green | Campus events with date, time, location, cover photo, and RSVP |
| 📣 **Announcement** | Red | Highlighted banner-style announcements |

**Feed features:**
- **Link-aware text** — URLs are auto-detected and rendered as tappable links with a redirect confirmation alert (`LinkText` component)
- **Image Grid** — supports 1, 2, or 3+ images with a collage layout and a `+N` overflow overlay
- **Image Lightbox** — tap any image to open a full-screen modal viewer
- **Like with bounce animation** — heart button scales up on tap via Animated spring
- **Comments** — inline comment thread with delete support
- **Poll voting** — visual progress bars appear after voting; anonymous mode hides voter identity
- **Event RSVP** — toggles from "I'm Going" button to a "You're Going!" confirmed state; shows live attendee count
- **Who's Going modal** — fetches and displays attendee avatars and names
- **Post Composer** (modal sheet) — rich creation form with type selector, image picker (up to 4), tag input, and type-specific fields
- **Real-time feed updates** — new posts and post mutations (likes, RSVPs) propagate via Supabase Realtime without a manual refresh

### 👤 Profile

- **View and edit** display name and avatar in real-time
- **Personality Profile card** — shows the user's archetype, action score, and social score; tappable to retake the test
- **Avatar upload** to Supabase Storage with cross-platform handling
- **Secure sign-out** with confirmation alert

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | React Native (Expo) | `expo ~54.0` / RN `0.81.5` |
| **Language** | TypeScript | `~5.9` |
| **Navigation** | React Navigation v7 (Stack + Bottom Tabs) | `^7.x` |
| **Backend / Database** | Supabase (PostgreSQL + Auth + Storage + Realtime) | `^2.105` |
| **State Management** | Zustand | `^5.0` |
| **Animations** | React Native Animated API (built-in) | — |
| **Gestures** | React Native Gesture Handler | `~2.28` |
| **Icons** | Lucide React Native | `^1.11` |
| **Image Picker** | Expo Image Picker | `~17.0` |
| **Gradients** | Expo Linear Gradient | `~15.0` |
| **Image Encoding** | base64-arraybuffer | `^1.0` |
| **Safe Area** | React Native Safe Area Context | `~5.6` |
| **Storage** | AsyncStorage (`@react-native-async-storage`) | `2.2.0` |

---

## 🏗 Architecture

```
Sparkup-v1/
├── App.tsx                     # Root component: auth listener, session bootstrap
├── index.ts                    # Expo entry point
├── app.json                    # Expo app config (name, slug, icons)
│
├── src/
│   ├── api/
│   │   └── supabase.ts         # Supabase client init (URL + anon key from .env)
│   │
│   ├── store/
│   │   └── useAuthStore.ts     # Zustand global store (session, user, profile)
│   │
│   ├── constants/
│   │   └── theme.ts            # COLORS, SIZES design tokens
│   │
│   ├── navigation/
│   │   └── RootNavigator.tsx   # Stack + Tab navigator definitions
│   │
│   └── screens/
│       ├── WelcomeScreen.tsx           # Splash / landing
│       ├── LoginScreen.tsx             # Sign-in / Sign-up form
│       ├── TermsScreen.tsx             # Legal disclaimer + age gate
│       ├── ProfileSetupScreen.tsx      # First-time profile creation
│       ├── PersonalityTestScreen.tsx   # 10-question psychometric test
│       ├── QuestionnaireScreen.tsx     # Alternative questionnaire flow
│       ├── HomeScreen.tsx              # Swipe deck (Discover)
│       ├── ChatScreen.tsx              # Match inbox
│       ├── ChatDetailScreen.tsx        # Individual chat thread
│       ├── PostsScreen.tsx             # Campus Feed
│       ├── ProfileScreen.tsx           # User profile editor
│       └── MatchScreen.tsx             # Match celebration modal
│
├── supabase_schema.sql         # Full DB schema migration (safe to re-run)
├── migrate_questions.sql       # Personality test question seed data
├── fix_user_answers_schema.sql # Patch for user_answers column types
└── seed_data.sql               # Optional sample data
```

### Data Flow

```
User Action
    │
    ▼
React Component (Screen)
    │  reads/writes
    ▼
Supabase JS Client (src/api/supabase.ts)
    │
    ├── Auth  ────────────────────► Supabase Auth (JWT sessions)
    ├── Database ─────────────────► PostgreSQL (RLS-protected tables)
    ├── Storage ──────────────────► Supabase Storage (avatars bucket)
    └── Realtime ─────────────────► Supabase Realtime (Postgres changes)
                                        │
                                        ▼
                               Component state update
                               (setMessages, setPosts, etc.)
```

---

## 🗺 Screen & Navigation Flow

```
Welcome
  └─► Login ──────────────────────────────────────────┐
        └─► TermsAndConditions                        │
              └─► ProfileSetup                        │ (returning user)
                    └─► PersonalityTest               │
                          └─► MainTabs ◄──────────────┘
                                ├── HomeTab (Swipe Deck)
                                │     └─► MatchModal (on mutual match)
                                ├── ChatsTab (Inbox)
                                │     └─► ChatDetail
                                ├── PostsTab (Campus Feed)
                                └── ProfileTab
                                      └─► PersonalityTest (retake)
```

---

## 🗄 Database Structure

All tables live in Supabase's PostgreSQL instance with **Row Level Security (RLS)** enabled.

### `users`

Extends `auth.users` with profile data.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | References `auth.users(id)` |
| `email` | `text` | User's email address |
| `name` | `text` | Display name |
| `bio` | `text` | Short bio |
| `avatar_url` | `text` | Public URL from Supabase Storage |
| `university_domain` | `text` | Domain extracted from email (e.g. `college.edu`) |
| `anonymous_id` | `text` | Random ID shown before a match unlocks (e.g. `User#4821`) |
| `is_verified` | `boolean` | Auto-set to `true` for MVP |
| `last_seen` | `timestamptz` | Used for online presence detection (< 5 min = active) |
| `personality_type` | `text` | `Trailblazer`, `Reflective Strategist`, `Social Drifter`, or `Reserved Drifter` |
| `total_score` | `int` | Aggregate personality score |
| `action_score` | `int` | Action dimension sub-score |
| `social_emotional_score` | `int` | Social dimension sub-score |
| `completed_personality_at` | `timestamptz` | Timestamp of test completion |

---

### `questions`

Stores the personality test questions.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `text` | `text` | Question text |
| `type` | `text` | e.g. `multiple_choice` |
| `options` | `jsonb` | Array of 4 option strings |
| `is_active` | `boolean` | Only active questions shown in-app |
| `created_at` | `timestamptz` | Used for ordering |

---

### `user_answers`

Stores each user's answer to each question.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `user_id` | `uuid` FK | References `users(id)` |
| `question_id` | `uuid` FK | References `questions(id)` |
| `answer_value` | `int` | Option index (0–3); used as a vector component |

> The array of `answer_value` sorted by question `created_at` forms the **personality vector** used in cosine similarity matching.

---

### `swipes`

Tracks every swipe action.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `swiper_id` | `uuid` FK | The user who swiped |
| `swiped_id` | `uuid` FK | The profile that was swiped on |
| `action` | `text` | `reject`, `right`, or `super` |
| Unique | — | `(swiper_id, swiped_id)` — prevents duplicate swipes |

---

### `matches`

Created when two users both swipe right on each other (handled by a DB trigger or app logic).

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `user1_id` | `uuid` FK | First user |
| `user2_id` | `uuid` FK | Second user |
| `compatibility_score` | `int` | Cosine similarity score (0–100) |
| `is_unlocked` | `boolean` | Whether the blurred photo is revealed |
| `created_at` | `timestamptz` | Match creation time |

---

### `messages`

Stores all chat messages for a match.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `match_id` | `uuid` FK | References `matches(id)` |
| `sender_id` | `uuid` FK | References `auth.users(id)` |
| `text` | `text` | Message content |
| `status` | `text` | `sent` → `read` |
| `created_at` | `timestamptz` | Timestamp |

> **RLS Policy**: Recipients (non-senders) can `UPDATE` message status to `read`, enabling the blue tick system.

---

### `posts`

The Campus Feed post table (polymorphic — covers all post types).

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `user_id` | `uuid` FK | Author |
| `author_name` | `text` | Denormalized display name |
| `author_avatar` | `text` | Denormalized avatar URL |
| `content` | `text` | Post body text |
| `post_type` | `text` | `text`, `poll`, `event`, `announcement` |
| `likes_count` | `int` | Denormalized like counter |
| `images` | `text[]` | Array of image URLs |
| `tags` | `text[]` | Hashtag array |
| `poll_options` | `jsonb` | `[{ id, text, votes, voters[] }]` |
| `poll_anonymous` | `boolean` | Hides voter identities |
| `poll_multi` | `boolean` | Allows multiple selections |
| `poll_expires_at` | `timestamptz` | Poll expiry |
| `event_title` | `text` | Event name |
| `event_date` | `text` | Human-readable date |
| `event_time` | `text` | Human-readable time |
| `event_location` | `text` | Venue |
| `event_cover` | `text` | Cover image URL |
| `event_rsvp_count` | `int` | RSVP counter |

---

### `post_likes`

Junction table for post reactions.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | — |
| `post_id` | `uuid` FK | References `posts(id)` |
| `user_id` | `uuid` FK | References `auth.users(id)` |
| Unique | — | `(post_id, user_id)` |

---

### `post_comments`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | — |
| `post_id` | `uuid` FK | References `posts(id)` |
| `user_id` | `uuid` FK | References `auth.users(id)` |
| `author_name` | `text` | Denormalized |
| `content` | `text` | Comment text |
| `created_at` | `timestamptz` | — |

---

### `event_rsvps`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | — |
| `post_id` | `uuid` FK | References `posts(id)` |
| `user_id` | `uuid` FK | References `auth.users(id)` |
| Unique | — | `(post_id, user_id)` — one RSVP per user per event |

#### RPC Function
```sql
-- Safe atomic increment for RSVP count
CREATE OR REPLACE FUNCTION increment_rsvp(post_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE posts SET event_rsvp_count = event_rsvp_count + 1 WHERE id = post_id;
$$;
```

---

### RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `posts` | Public | Own posts only | Allowed (for likes/rsvp counts) | Own posts only |
| `post_likes` | Public | Own user only | — | Own user only |
| `post_comments` | Public | Own user only | — | Own user only |
| `event_rsvps` | Public | Own user only | — | — |
| `messages` | Match participants | Match participants | Recipient (for `read` status) | — |

---

## 🧠 State Management

SparkUp uses **Zustand** for global client state. The single store (`useAuthStore`) holds:

```typescript
interface AuthState {
  session: Session | null;   // Supabase auth session
  user: User | null;         // Authenticated user object
  profile: any | null;       // Row from the `users` table
  loading: boolean;

  setSession(session): void;
  setUser(user): void;
  setProfile(profile): void;
  signOut(): Promise<void>;
  fetchProfile(): Promise<void>;  // Re-fetches profile from DB into store
}
```

The `App.tsx` root component subscribes to `supabase.auth.onAuthStateChange` and updates the store accordingly, then routes the user through the correct initial screen.

All other state (messages, posts, profiles) is **local component state** managed with React `useState` / `useEffect`, keeping global state minimal and focused on auth.

---

## 🔬 Key Algorithms

### Personality Classification

The 10-question test maps each answer to a value `[+2, +1, −1, −2]` based on option index. Two dimensions are computed:

- **Action Score**: Sum of values for questions 3, 5, 6, 10 (0-indexed: 2, 4, 5, 9)
- **Social Score**: Sum of values for questions 1, 4, 7, 8 (0-indexed: 0, 3, 6, 7)

The four archetypes:

| Action | Social | Type |
|---|---|---|
| > 0 | > 0 | **Trailblazer** — Campus Main Character |
| > 0 | ≤ 0 | **Reflective Strategist** — Low-Key Visionary |
| ≤ 0 | > 0 | **Social Drifter** — Vibe Ambassador |
| ≤ 0 | ≤ 0 | **Reserved Drifter** — Ultimate Stoic |

---

### Compatibility Scoring (Cosine Similarity)

Each user's answer vector is an array of their `answer_value` integers, sorted by question `created_at`. Two vectors are compared using:

```
similarity = ((dot(A, B) / (|A| × |B|)) + 1) / 2 × 100
```

This maps the cosine range `[−1, 1]` to a human-readable percentage `[0, 100]`. A score of **100%** means perfectly aligned answers; **50%** is neutral.

The algorithm is computed **client-side** at discovery time, running in parallel for all candidate profiles before sorting the deck from highest to lowest compatibility.

---

### Online Presence

A user is considered "Active now" if their `last_seen` timestamp is within the past 5 minutes:

```typescript
const isOnline = (lastSeen: string | null) => {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) / 60000 < 5;
};
```

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js `>= 18`
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- A Supabase project (free tier is sufficient)
- Expo Go app on your phone, or an Android/iOS simulator

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Sparkup-v1

# 2. Install dependencies
npm install

# 3. Configure environment variables (see below)
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Apply database migrations in Supabase SQL Editor
#    Run in order:
#    1. supabase_schema.sql
#    2. migrate_questions.sql
#    3. fix_user_answers_schema.sql (if needed)

# 5. Create the 'avatars' storage bucket in Supabase
#    Dashboard → Storage → New bucket → Name: avatars → Public: ✓

# 6. Start the development server
npx expo start
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

These are accessed in `src/api/supabase.ts` via `process.env.EXPO_PUBLIC_*`.

---

## ⚙️ Supabase Configuration

### 1. Authentication

- Enable **Email/Password** provider in `Authentication → Providers`
- Optionally disable email confirmation for faster testing (`Authentication → Settings → Confirm email: OFF`)

### 2. Storage

- Create a bucket named `avatars` and set it to **Public**
- Add a storage policy allowing authenticated users to upload:
  ```sql
  CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');
  ```

### 3. Realtime

- Enable Realtime for the following tables in `Database → Replication`:
  - `messages`
  - `matches`
  - `posts`

### 4. Row Level Security

Run `supabase_schema.sql` which creates all tables, RLS policies, and the `increment_rsvp` RPC function. It is idempotent (safe to re-run).

---

## 🔭 Future Scope

### Near-term (v1.1)

- [ ] **Push Notifications** — notify users of new matches and messages using Expo Notifications
- [ ] **Message reactions** — emoji reacts on chat bubbles
- [ ] **Profile photo privacy** — blur avatars until match is confirmed (`is_unlocked = true`)
- [ ] **Report / Block users** — in-app safety tools
- [ ] **Typing indicators** in chat

### Medium-term (v2.0)

- [ ] **Campus scoping** — filter discovery and feed by `university_domain` so users only see peers from their institution
- [ ] **Interest tags** — users add interest tags (e.g. `#Photography`, `#Cricket`) to boost match relevance
- [ ] **AI-powered icebreakers** — suggest a first message based on shared personality traits
- [ ] **Story/Status feature** — 24-hour ephemeral status updates
- [ ] **Group chats** — multi-user conversations for study groups, event attendees, etc.
- [ ] **Event discovery map** — map view for campus events with geolocation

### Long-term (v3.0)

- [ ] **Server-side matching** — move cosine similarity to a Supabase Edge Function for scale and real-time re-scoring as new answers are submitted
- [ ] **Advanced analytics dashboard** — engagement metrics, match rates, and event attendance tracking for campus organisers
- [ ] **Moderation tools** — AI content moderation for posts and messages
- [ ] **Premium tier** — super-likes, advanced filters, profile boosts
- [ ] **Cross-campus discover** — optional mode to match with students from partner institutions
- [ ] **Native app distribution** — publish to App Store and Google Play via EAS Build

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push and open a Pull Request

---

## 📄 License

This project is private and not open-sourced. All rights reserved.

---

<div align="center">
  <strong>Built with ⚡ by the SparkUp team</strong><br/>
  <em>Connecting campus, one spark at a time.</em>
</div>
