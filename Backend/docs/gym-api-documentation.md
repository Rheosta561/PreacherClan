# Gym API Documentation

This document covers the gym joining flow and all gym-related APIs currently wired in the backend.

## 1. API Groups

There are two parallel gym API surfaces in this codebase:

1. Legacy user-authenticated gym routes
   - Mounted in [`app.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/app.js)
   - Base paths: `/gym` and `/join`
   - Auth middleware: user JWT via [`Middleware/auth.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/Middleware/auth.js)
   - Used for gym discovery, joining, and member self check-in

2. Gym dashboard / gym-account routes
   - Mounted in [`app.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/app.js)
   - Base paths: `/api/gym-auth`, `/api/gym`, `/api/reviews`, `/api/grievances`, `/api/internal`
   - Auth middleware: gym JWT via [`Middleware/gymAuthMiddleware.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/Middleware/gymAuthMiddleware.js)
   - Used for gym login, profile management, members, trainers, overview, announcements, maintenance, entry logs, review moderation, and grievance handling

## 2. Authentication Model

### User-authenticated gym routes

- Require the standard user auth middleware.
- Mounted as:
  - `/gym`
  - `/join`
- Intended for app users who join a gym or check in to a gym.

### Gym-authenticated dashboard routes

- Gym access token can be supplied through:
  - `Authorization: Bearer <token>`
  - Cookie named `gymAccessToken` by default
- Refresh token is cookie-based:
  - Default cookie name: `gymRefreshToken`
  - Cookie path: `/api/gym-auth`
- Gym tokens must have `role: "gym"` and `type: "access"`.
- Inactive gym accounts are rejected.

## 3. Core Gym Data Model

Main gym schema: [`Models/GymSchema.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/Models/GymSchema.js)

Important fields:

- `name`, `username`, `password`, `gymCode`
- `location`, `description`
- `image`, `profileImage`, `gallery`
- `address.country`, `address.state`, `address.city`, `address.latitude`, `address.longitude`
- `contact.email`, `contact.phone`
- `facilities[]`, `equipment[]`
- `membership.monthly`, `quarterly`, `halfYearly`, `yearly`
- `members[]`, `trainers[]`, `owner`
- `rating`, `reviewCount`, `reviews[]`
- `featured`, `isVerified`, `isActive`

User membership fields live in [`Models/User.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/Models/User.js):

- `gym.id`, `gym.name`
- `gymMembership`
- `gymMembershipHistory[]`

Membership types:

- `Monthly`
- `Quarterly`
- `HalfYearly`
- `Yearly`

Membership statuses:

- `Active`
- `Paused`
- `Expired`
- `Revoked`

## 4. Gym Joining Flow

### Primary join endpoint

- Method: `GET`
- Path: `/join/:gymCode/:userId`
- Route file: [`Routes/joinGymRouter.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/Routes/joinGymRouter.js)
- Controller: [`Controllers/userJoinController.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/Controllers/userJoinController.js)
- Auth: user auth required because `/join` is mounted behind `authMiddleware`

#### Behavior

1. Finds the gym by `gymCode`
2. Finds the user by `userId`
3. Rejects if the user already has `user.gym.id`
4. Writes both sides of the relationship:
   - Updates `User.gym`
   - Creates `User.gymMembership`
   - Adds the user to `Gym.members`
   - Adds the user to `Gym.trainers` if `user.isTrainer` is truthy
5. Sends a welcome email
6. Sends an in-app notification

#### Success response

```json
{
  "message": "User joined gym successfully"
}
```

#### Important side effects

- Membership status is set to `Active`
- `membershipStartsAt` and `joinedAt` are set to current time
- `membershipEndsAt`, `revokedAt`, and `revokedReason` are initialized as `null`

#### Error cases

- `404` if gym not found
- `404` if user not found
- `400` if user already joined a gym
- `500` on unexpected failure

### Legacy join endpoint

- Method: `GET`
- Path: `/gym/join/:gymCode/:userId`
- Route file: [`Routes/GymRoutes.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/Routes/GymRoutes.js)

This is older and only pushes the user into `Gym.members`. It does not fully maintain membership state like the newer `/join/:gymCode/:userId` controller. Prefer the `/join/...` route for joining.

## 5. Legacy User-Facing Gym Routes

Mounted under `/gym` in [`app.js`](/Users/anubhavmishra/Documents/GitHub/PreacherClan%20Web/Backend/app.js).

### `POST /gym/create`

Creates a gym using multipart upload.

Request characteristics:

- Uses Cloudinary upload middleware
- Accepts files:
  - `image`
  - `profileImage`
  - `gallery[]`
- Accepts text fields including:
  - `name`, `location`, `description`, `rating`
  - `facilities`, `equipment`, `membership` as comma-separated strings
  - `country`, `state`, `city`, `lattitude`, `longitude`
  - `email`, `phone`
  - `trainers`, `members` as JSON strings

Response:

- `201` with full created gym document

Notes:

- Generates a random 6-digit `gymCode`
- Stores `address.lattitude` for backward compatibility

### `GET /gym/all`

Returns all gyms.

### `GET /gym/gym/:gymId`

Returns a single gym with populated `members` and `owner`.

Response shape:

```json
{
  "gym": {
    "_id": "gymObjectId",
    "name": "Gym Name",
    "username": "gym_username",
    "location": "City",
    "description": "Gym description",
    "image": "https://...",
    "profileImage": "https://...",
    "gallery": [],
    "rating": 4.6,
    "reviewCount": 12,
    "facilities": [],
    "equipment": [],
    "membership": {
      "monthly": 1200,
      "quarterly": 3200,
      "halfYearly": 6000,
      "yearly": 11000
    },
    "address": {
      "country": "India",
      "state": "Madhya Pradesh",
      "city": "Indore",
      "latitude": 22.7196,
      "longitude": 75.8577
    },
    "contact": {
      "email": "gym@example.com",
      "phone": "9999999999"
    },
    "members": [],
    "owner": {}
  }
}
```

Notes:

- The route uses `Gym.findOne({ _id: req.params.gymId })`
- It populates `members` and `owner`
- It also tries to populate each related `profile`
- If the gym does not exist, it returns `404`

### `GET /gym/featured`

Behavior:

- Returns featured gyms when present
- Otherwise returns top 10 gyms sorted by rating

### `POST /gym/entry/access`

Main member check-in endpoint.

Behavior:

- Validates authenticated user
- Accepts `gymCode` or `gymId`
- Confirms user belongs to gym
- Reads user geolocation from `User.location.coordinates`
- Reads gym geolocation from `gym.address.latitude` or `gym.address.lattitude`
- Checks distance against `GYM_ENTRY_RADIUS_METERS` env, default `5`
- Writes an `EntryLog`
- Updates streak using `updateStreak`

Request body:

```json
{
  "gymCode": "ABC123",
  "userId": "optional-if-auth-user-matches"
}
```

Success response:

```json
{
  "message": "Entry recorded successfully",
  "gym": "Gym Name",
  "gymId": "gymObjectId",
  "distanceMeters": 2.13,
  "currStreak": 5,
  "streakUpdated": true,
  "workoutHitsPerWeek": 4
}
```

Failure highlights:

- `401` missing user auth
- `403` trying to check in for another user
- `403` user not a member
- `403` outside allowed radius
- `422` gym location missing
- `422` user location missing

### `POST /gym/streak/scan`

Alias to the same location-based check-in handler as `/gym/entry/access`.

### Deprecated endpoints

- `GET /gym/streak/:gymCode/:userId`
- `POST /gym/qr/generate`

Both return `410 Gone` and instruct clients to use `POST /gym/entry/access`.

## 6. Gym Account Auth APIs

Mounted under `/api/gym-auth`.

### `POST /api/gym-auth/register`

Registers a gym account and immediately returns auth tokens.

Required body fields:

- `name`
- `username`
- `password`
- `location`
- `description`
- `gymCode`

Optional body fields:

- `contact.email`
- `contact.phone`
- `address.latitude`
- `address.longitude`
- `rating`
- `membership.monthly`
- `membership.quarterly`
- `membership.halfYearly`
- `membership.yearly`
- `facilities[]`
- `equipment[]`
- `gallery[]`

Validation rules:

- `username` lowercased, 3-30 chars, `^[a-z0-9._-]+$`
- `password` must be 8-128 chars with lowercase, uppercase, and digit

Success response:

```json
{
  "message": "Gym registered successfully",
  "accessToken": "jwt",
  "gym": {}
}
```

### `POST /api/gym-auth/login`

Body:

```json
{
  "username": "ironhub",
  "password": "StrongPass123"
}
```

Success response:

```json
{
  "message": "Gym login successful",
  "accessToken": "jwt",
  "gym": {}
}
```

### `POST /api/gym-auth/refresh`

- Uses refresh cookie only
- Returns a new access token and rotates the refresh session

### `POST /api/gym-auth/logout`

- Clears cookies
- Removes current refresh session when refresh cookie is present

### `POST /api/gym-auth/logout-all`

- Auth required
- Clears every refresh session for the gym

### `GET /api/gym-auth/me`

- Auth required
- Returns current sanitized gym account

## 7. Gym Profile APIs

Mounted under `/api/gym`.

### `GET /api/gym/profile`

Returns editable gym profile payload:

```json
{
  "profile": {
    "id": "gymId",
    "name": "Gym Name",
    "username": "gym_username",
    "location": "City",
    "description": "Description",
    "image": null,
    "profileImage": null,
    "gallery": [],
    "address": {
      "country": "",
      "state": "",
      "city": "",
      "latitude": null,
      "longitude": null
    },
    "contact": {
      "email": "",
      "phone": ""
    },
    "facilities": [],
    "equipment": [],
    "membership": {
      "monthly": 0,
      "quarterly": 0,
      "halfYearly": 0,
      "yearly": 0
    }
  }
}
```

This is the "current logged-in gym detail" endpoint for the gym dashboard.

Use this when the authenticated gym account wants its own complete editable profile.

### `PATCH /api/gym/profile`

Editable fields:

- `name`
- `location`
- `description`
- `address`
- `contact`
- `facilities`
- `equipment`
- `membership`

Notes:

- `address`, `contact`, and `membership` can be JSON objects or JSON strings
- `facilities` and `equipment` can be arrays, JSON strings, or comma-separated strings
- `address.latitude` updates both `latitude` and legacy `lattitude`

### `PATCH /api/gym/profile/media`

Multipart upload endpoint for:

- `image`
- `profileImage`
- `gallery`

Optional form field:

- `replaceGallery=true`

Behavior:

- Replaces `image` and `profileImage` when provided
- Appends to gallery by default
- Replaces gallery when `replaceGallery=true`

### `DELETE /api/gym/profile/gallery-image`

Body:

```json
{
  "imageUrl": "https://..."
}
```

Removes one gallery image if it belongs to the gym.

## 8. Members APIs

Mounted under `/api/gym`.

### `GET /api/gym/members`

Query params:

- `search`
- `status`: `Active | Paused | Expired | Revoked`
- `membershipType`: `Monthly | Quarterly | HalfYearly | Yearly`
- `page`
- `limit`

Response shape:

- `members[]`
- `pagination`
- `filters`
- `export.columns`

Each member row includes:

- `id`
- `name`
- `username`
- `email`
- `avatar`
- `membershipType`
- `membershipStatus`
- `membershipStartsAt`
- `membershipEndsAt`

### `PATCH /api/gym/members/:memberId/membership`

Body fields:

- `membershipType`
- `membershipStatus`
- `membershipStartsAt`
- `membershipEndsAt`

Behavior:

- Requires member to belong to the gym on both `Gym.members` and `User.gym.id`
- Ensures end date is not before start date
- Keeps user linked to gym
- May create revenue events through `membershipRevenueService`

### `POST /api/gym/members/:memberId/revoke`

Optional body:

```json
{
  "reason": "Non payment"
}
```

Behavior:

- Removes member from `Gym.members`
- Removes trainer link from `Gym.trainers`
- Clears `User.gym`
- Writes final membership state into `gymMembershipHistory`
- Marks current membership as `Revoked` or `Expired`
- May record refund/revocation event

## 9. Trainers APIs

Mounted under `/api/gym`.

### `GET /api/gym/trainers`

Query:

- `search`
- `page`
- `limit`

Returns paginated trainer mappings with:

- `id`
- `trainerUserId`
- `name`
- `username`
- `image`
- `email`
- `fee`
- `tags`
- `assignedMembersCount`
- `assignedMembersPreview`
- `isActive`

### `GET /api/gym/trainers/search-users`

Searches normal users that are not already trainer mappings for this gym.

### `POST /api/gym/trainers`

Body:

```json
{
  "trainerUserId": "userObjectId",
  "fee": 1500,
  "tags": ["strength", "fat loss"]
}
```

Behavior:

- Creates `GymTrainer` mapping
- Adds trainer user to `Gym.trainers`

### `GET /api/gym/trainers/:trainerId`

Returns full trainer details plus assigned members.

Request:

- Method: `GET`
- Path: `/api/gym/trainers/:trainerId`
- Auth: gym access token required
- Validation: `trainerId` must be a valid Mongo ObjectId

Behavior:

- Looks up the trainer mapping in `GymTrainer`
- Ensures the trainer mapping belongs to the authenticated gym
- Populates:
  - `trainerUserId` with `name`, `username`, `email`, `image`
  - `assignedMembers` with `name`, `username`, `image`

Response shape:

```json
{
  "trainer": {
    "id": "trainerMappingId",
    "trainerUserId": "userObjectId",
    "name": "Rahul Sharma",
    "username": "rahulfit",
    "image": "https://...",
    "email": "rahul@example.com",
    "fee": 1500,
    "tags": ["strength", "weight loss"],
    "assignedMembersCount": 2,
    "assignedMembersPreview": [
      {
        "id": "member1",
        "name": "Aman",
        "username": "aman01",
        "image": "https://...",
        "email": "aman@example.com"
      }
    ],
    "isActive": true,
    "createdAt": "2026-04-10T08:00:00.000Z",
    "updatedAt": "2026-04-10T08:00:00.000Z",
    "assignedMembers": [
      {
        "id": "member1",
        "name": "Aman",
        "username": "aman01",
        "image": "https://...",
        "email": "aman@example.com"
      },
      {
        "id": "member2",
        "name": "Riya",
        "username": "riyafit",
        "image": "https://...",
        "email": "riya@example.com"
      }
    ]
  }
}
```

Field meaning:

- `id`: `GymTrainer` mapping id, not the user id
- `trainerUserId`: actual user account id for the trainer
- `assignedMembersCount`: number of linked members
- `assignedMembersPreview`: short preview list
- `assignedMembers`: full assigned member list for detail view

Error cases:

- `404` if trainer mapping does not exist for this gym
- `401` if gym auth token is missing/invalid
- `422` if `trainerId` is not a valid Mongo id

### `PATCH /api/gym/trainers/:trainerId`

Editable fields:

- `fee`
- `tags`
- `isActive`

### `DELETE /api/gym/trainers/:trainerId`

Deletes trainer mapping and removes trainer from `Gym.trainers`.

### `POST /api/gym/trainers/:trainerId/assign-member`

Body:

```json
{
  "memberUserId": "userObjectId"
}
```

Requires the target member to belong to the gym.

### `DELETE /api/gym/trainers/:trainerId/assign-member/:memberUserId`

Unassigns a member from a trainer.

## 10. Overview APIs

Mounted under `/api/gym`.

Revenue filters:

- `monthly`
- `quarterly`
- `yearly`

### `GET /api/gym/overview`

Query:

- `filter=monthly|quarterly|yearly`

Returns:

- `stats`
- `revenue`
- `insights`

### `GET /api/gym/overview/stats`

Returns dashboard cards:

- `earningsThisYear`
- `monthlyEarnings`
- `activeMembers`
- `expiringSoon`
- `expiredMemberships`
- `breakdown.memberships`
- `breakdown.renewals`
- `breakdown.affiliates`

### `GET /api/gym/overview/revenue`

Returns:

- `filter`
- `points[]`
- `totals.memberships`
- `totals.renewals`
- `totals.affiliates`
- `totals.overall`

Point shape depends on filter:

- `monthly`: one point per day
- `quarterly`: one point per month in current quarter
- `yearly`: one point per month in current year

### `GET /api/gym/overview/insights`

Returns four insight cards:

- renewals dropping
- equipment maintenance attention
- pending grievances
- peak hour congestion

## 11. Entry Logs APIs

Mounted under `/api/gym`.

### `POST /api/gym/entry-logs`

Body:

```json
{
  "memberUserId": "userObjectId",
  "actionType": "check_in",
  "source": "Manual",
  "status": "Checked In",
  "occurredAt": "2026-04-10T08:00:00.000Z",
  "notes": "Front desk entry"
}
```

Allowed values:

- `actionType`: `check_in | check_out`
- `source`: `QR | Manual | RFID | Mobile`
- `status`: `Checked In | Checked Out | Denied`

If `status` is omitted, it is derived from action type.

### `GET /api/gym/entry-logs`

Query params:

- `search`
- `date` in `YYYY-MM-DD`
- `day`
- `startTime` in `HH:mm`
- `endTime` in `HH:mm`
- `status`
- `source`
- `page`
- `limit`
- `sortBy=occurredAt|status|source`
- `sortOrder=asc|desc`

Returns paginated rows with:

- `id`
- `memberUserId`
- `member`
- `membership`
- `date`
- `day`
- `time`
- `source`
- `status`
- `actionType`
- `notes`

### `GET /api/gym/entry-logs/analytics/by-time`

Required query:

- `date=YYYY-MM-DD`

Optional query:

- `window=all|morning|afternoon|evening|night`

Returns hourly entry counts for check-ins.

### `GET /api/gym/entry-logs/export`

Same filtering surface as list API, but returns all matching rows and export column names.

## 12. Maintenance APIs

Mounted under `/api/gym`.

Categories:

- `Equipment`
- `Facility`
- `Safety`
- `Cleaning`

Statuses:

- `Scheduled`
- `In Progress`
- `Completed`
- `Cancelled`

### `POST /api/gym/maintenance`

Required fields:

- `title`
- `description`
- `category`
- `scheduledAt`

Optional:

- `status`
- `notes`

### `GET /api/gym/maintenance`

Query:

- `search`
- `status`
- `category`
- `date`
- `page`
- `limit`
- `sortBy=scheduledAt|createdAt|updatedAt|status|category`
- `sortOrder=asc|desc`

### `GET /api/gym/maintenance/:maintenanceId`

Returns one maintenance task.

### `PATCH /api/gym/maintenance/:maintenanceId`

Editable fields:

- `title`
- `description`
- `category`
- `scheduledAt`
- `notes`

### `PATCH /api/gym/maintenance/:maintenanceId/status`

Allowed transitions:

- `Scheduled -> In Progress | Cancelled | Completed`
- `In Progress -> Completed | Cancelled`
- `Completed -> none`
- `Cancelled -> none`

### `DELETE /api/gym/maintenance/:maintenanceId`

Restriction:

- Completed tasks cannot be deleted

## 13. Announcement APIs

Mounted under `/api/gym`.

Categories:

- `Facility`
- `Events`
- `Policy`
- `Offer`
- `Maintenance`

Audiences:

- `All Members`
- `Trainers`
- `Staff`

Statuses:

- `Draft`
- `Sent`
- `Failed`

### `POST /api/gym/announcements`

Required fields:

- `title`
- `message`
- `category`
- `audience`
- `deliveryChannels`

Delivery channels:

```json
{
  "deliveryChannels": {
    "push": true,
    "email": false
  }
}
```

At least one of `push` or `email` must be enabled.

Optional:

- `subjectLine`

Behavior:

- Creates an announcement record
- Resolves target users based on audience
- Inserts in-app notification records
- Emits socket events to online users
- Sends push notifications when enabled
- Sends emails when enabled
- Saves delivery stats and failures

### `GET /api/gym/announcements`

Query:

- `search`
- `category`
- `audience`
- `status`
- `page`
- `limit`
- `sortBy=createdAt|updatedAt|sentAt|status|category|audience`
- `sortOrder=asc|desc`

### `GET /api/gym/announcements/:announcementId`

Returns one announcement with delivery summary.

## 14. Reviews APIs

### User-facing review APIs

Mounted under `/api/reviews`.

#### `POST /api/reviews`

User auth required.

Body:

```json
{
  "gymId": "gymObjectId",
  "rating": 5,
  "comment": "Great trainers",
  "images": []
}
```

Rules:

- Only current members of the gym can review
- One review per user per gym

#### `GET /api/reviews/gym/:gymId`

Public listing for a gym.

#### `GET /api/reviews/:reviewId`

Public review detail.

#### `PATCH /api/reviews/:reviewId`

User auth required.

Only the review owner can update.

#### `DELETE /api/reviews/:reviewId`

User auth required.

Only the review owner can delete.

### Gym dashboard review APIs

Mounted under `/api/gym`.

#### `GET /api/gym/reviews`

Query:

- `search`
- `rating`
- `page`
- `limit`
- `sortBy=createdAt|updatedAt|rating`
- `sortOrder=asc|desc`

Returns:

- `items[]`
- `summary.averageRating`
- `summary.totalReviews`

#### `DELETE /api/gym/reviews/:reviewId`

Deletes a review only if it belongs to the authenticated gym.

## 15. Grievance APIs

Type values:

- `Billing`
- `Facility`
- `Staff`
- `Safety`
- `Other`

Status values:

- `Open`
- `In Review`
- `Resolved`
- `Closed`

Priority values:

- `Low`
- `Medium`
- `High`

### User-facing grievance APIs

Mounted under `/api/grievances`.

#### `POST /api/grievances`

User auth required.

Body:

```json
{
  "gymId": "gymObjectId",
  "subject": "Broken treadmill",
  "description": "Machine near entrance is unsafe.",
  "type": "Safety",
  "priority": "High",
  "attachments": []
}
```

Rules:

- Only members of that gym can create grievances

#### `GET /api/grievances/me`

Returns current user grievances with optional status filter.

#### `GET /api/grievances/:grievanceId`

Returns grievance detail for owner only.

#### `PATCH /api/grievances/:grievanceId`

Only grievance owner can update.

Restriction:

- Only grievances in `Open` state are editable by the member

#### `DELETE /api/grievances/:grievanceId`

Only grievance owner can delete.

Restriction:

- Only grievances in `Open` state can be deleted by the member

### Gym dashboard grievance APIs

Mounted under `/api/gym`.

#### `GET /api/gym/grievances`

Query:

- `search`
- `status`
- `type`
- `page`
- `limit`
- `sortBy=createdAt|updatedAt|status|priority|type`
- `sortOrder=asc|desc`

#### `GET /api/gym/grievances/:grievanceId`

Returns a grievance if it belongs to the authenticated gym.

#### `PATCH /api/gym/grievances/:grievanceId/status`

Body:

```json
{
  "status": "In Review"
}
```

Allowed transitions:

- `Open -> In Review | Resolved | Closed`
- `In Review -> Resolved | Closed`
- `Resolved -> Closed`
- `Closed -> none`

#### `PATCH /api/gym/grievances/:grievanceId`

Editable fields:

- `notesByGym`
- `priority`

### Internal reminder endpoint

- Method: `POST`
- Path: `/api/internal/grievances/send-reminders`
- Header required: `x-internal-secret`

Behavior:

- Finds unresolved grievances older than configured threshold
- Emails gym contact/owner
- Updates `reminderMeta.lastReminderSentAt`
- Increments `reminderMeta.reminderCount`

## 16. Known Implementation Notes

1. Joining is duplicated in two places.
   - `/join/:gymCode/:userId` is the more complete membership-aware flow.
   - `/gym/join/:gymCode/:userId` is older and only mutates gym membership array.

2. Gym create and gym auth register are separate concepts.
   - `/gym/create` creates a gym document from the legacy user-auth side.
   - `/api/gym-auth/register` creates a gym login account using the modern auth flow.
   - Because both operate on the same `Gym` model, product flows should be aligned carefully.

3. Location check-in depends on user coordinates being stored elsewhere first.
   - Member location is read from `User.location.coordinates`.

4. `latitude` and `lattitude` both exist in the schema.
   - This is intentional backward compatibility and should be preserved unless migrated carefully.

5. Announcement status starts as `Sent`.
   - Even before delivery attempts finish, the base announcement record is created with `status: "Sent"` and later adjusted to `Sent` or `Failed`.

6. Review and grievance membership authorization is strict.
   - The user must be in both `Gym.members` and `User.gym.id`.

## 17. Suggested Frontend Usage Order

### For member join flow

1. Discover gym via `/gym/all`, `/gym/featured`, or `/gym/gym/:gymId`
2. Join via `/join/:gymCode/:userId`
3. Check in via `/gym/entry/access`
4. Submit reviews via `/api/reviews`
5. Submit grievances via `/api/grievances`

### For gym dashboard

1. Register/login via `/api/gym-auth`
2. Fetch session via `/api/gym-auth/me`
3. Load dashboard via `/api/gym/overview`
4. Manage profile via `/api/gym/profile`
5. Manage members/trainers/maintenance/announcements using `/api/gym/*`
