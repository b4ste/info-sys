# Student Information System

A React and Express SIS for students, faculty, and admins. The frontend calls a JSON API; only the backend connects to MongoDB. Accounts, academic structure, class offerings, enrollment, grading, corrections, and audit history are stored in separate collections.

## Run locally

Requirements: Node.js 22+, npm, and access to a MongoDB Atlas cluster.

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` to your Atlas connection URI and `MONGODB_DB_NAME` to `student_infosys`. Keep the Atlas URI's path and query parameters as supplied by Atlas. Set `JWT_SECRET` to a random string of at least 32 characters. This workspace already has a local `.env` with a generated secret.
4. Start the API with `npm run server:dev`.
5. In another terminal, start the frontend with `npm run dev` and open `http://localhost:5173`.
6. Create the first admin account as shown below. Sign in and change the temporary password.

On Windows PowerShell where `npm.ps1` is blocked, use `npm.cmd` instead of `npm`.

The API runs at `http://localhost:4000`. `GET /api/health` reports the API and MongoDB connection. Vite proxies `/api` to port 4000 during development.

The `.env` file is ignored by Git. Ensure your Atlas database user and network access settings allow this machine to connect. Atlas credentials must never be placed in frontend `VITE_` variables.

## Deploy for your group (Render API + Vercel frontend)

Deploy the API first. Your groupmates will use the Vercel URL; they do not need your `.env` or their own Atlas database.

1. Push the repository to GitHub, keeping `.env` untracked. In [Render](https://dashboard.render.com/), choose **New → Blueprint**, select the repository, and use the included `render.yaml`. When prompted for `MONGODB_URI`, enter the Atlas connection string in Render's environment settings. Render generates `JWT_SECRET` for this service. The database name is `student_infosys`. Do not add an existing bootstrap admin password to Render; accounts are already stored in Atlas.
2. In [Atlas Network Access](https://cloud.mongodb.com/), add the outbound IP ranges shown under your Render service's **Connect → Outbound** tab. Keep the Atlas database password in Render only. If a credential was previously shared, rotate it in Atlas and update Render's `MONGODB_URI`. Once the service is live, open `https://YOUR-RENDER-SERVICE.onrender.com/api/health` and confirm MongoDB reports connected.
3. Once Render gives you its URL, edit `vercel.json`: add this rewrite **before** the existing `/(.*)` rewrite, replacing the example host with your actual Render host:

   ```json
   { "source": "/api/:path*", "destination": "https://YOUR-RENDER-SERVICE.onrender.com/api/:path*" }
   ```

   This makes API requests and session cookies use the same Vercel site origin. Leave `VITE_API_BASE_URL` unset on Vercel.
4. Push that change, then in [Vercel](https://vercel.com/new) import the same GitHub repository. Use **Framework Preset: Vite**, **Root Directory: `./`**, **Build Command: `npm run build`**, and **Output Directory: `dist`**. Deploy and open the production `*.vercel.app` URL. The existing `vercel.json` also lets page refreshes work on routes such as `/admin`.
5. In the Render service's **Environment** settings, set `CLIENT_ORIGIN` to the exact Vercel production origin (for example, `https://your-site.vercel.app`, without a trailing slash), then redeploy the API. Check the Vercel site's connection status and sign in with an existing SIS account.

Render's free web service can sleep when idle, so the first request after inactivity may take longer. Vercel preview domains differ from the production domain; this setup is for the production URL. Never put `MONGODB_URI` or `JWT_SECRET` in Vercel variables or the repository.

### First admin account

There is no public sign-up. Create the initial admin once in PowerShell:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = 'you@example.com'
$env:BOOTSTRAP_ADMIN_PASSWORD = 'choose-a-strong-password'
npm.cmd run admin:bootstrap
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD
```

Use your own email and a password containing an uppercase letter, a lowercase letter, and a special character. There is no minimum length. The command refuses to create another account after an admin exists. In the admin portal, create student or faculty accounts with first, optional middle, and last names under **Accounts**, then link each to an official profile under **Students** or **Faculty**. Existing accounts with only a display name remain visible and can be updated through **Edit name**.

### Academic setup order

1. Create departments, programs with year levels, and subjects.
2. Create curriculum rules linking subjects to programs and year levels.
3. Create the three academic terms for an academic year, set dates, then explicitly activate one term.
4. Create term-specific sections and student/faculty profiles.
5. Create class offerings with faculty, capacity, schedule, and grade component weights.
6. Students request enrollment; admins approve or reject. Faculty then enter, submit, finalize, and publish grades.

Only one term may be active. The database enforces this with a partial unique index. Sections belong to a term; class offerings are separate records.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB connection URI | Required |
| `MONGODB_DB_NAME` | Database selected by Mongoose | `student_infosys` |
| `JWT_SECRET` | Session signing secret, at least 32 characters | Required |
| `PORT` | API port | `4000` |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `NODE_ENV` | `development`, `test`, or `production` | `development` |
| `FINAL_GRADE_MIN`, `FINAL_GRADE_MAX` | Allowed official grade range | `0`, `100` |
| `GRADE_DECIMALS` | Calculated percentage rounding places | `2` |
| `VITE_API_BASE_URL` | API origin when frontend is hosted separately | Same origin |

The calculated grade is a weighted percentage. The official final grade is entered by faculty and remains separate. Configure the official grade range to match the school policy. Missing scores block completion, and no GPA or retake replacement policy is applied. Never put database credentials or secrets in `VITE_` variables; those are exposed to the browser.

In production, serve the frontend over HTTPS and set `NODE_ENV=production` so session cookies require HTTPS. Set `CLIENT_ORIGIN` to the actual frontend origin.

## Permissions and workflow

- Only admins create accounts and academic records. Students and faculty can edit only permitted contact fields in their own profiles.
- Protected requests reload the account from MongoDB and reject inactive users. Login is rate limited. Sessions use signed, HTTP-only cookies; logout invalidates the session token.
- Student enrollment requests require an open offering, active term, open enrollment dates, matching program and year level, no duplicate offering enrollment, and available capacity. Approval checks again and reserves capacity atomically. Pending, rejected, and withdrawn requests do not occupy seats.
- Grade components use the offering's configured weights. Faculty can edit assigned draft or submitted grades. Students see only published grades. Admins have no ordinary grade edit endpoint.
- Published grade changes require a faculty correction request and admin decision. Approved changes preserve the previous final grade in the grade revision history and audit log.
- Retakes use separate offerings, enrollments, and grades. Earlier attempts remain available in student history.

## API

All API responses use `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`. List endpoints accept `page` and `limit` plus resource filters.

- Authentication: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/change-password`
- Accounts and profiles: `/api/users`, `/api/students`, `/api/faculty`
- Academic resources: `/api/departments`, `/api/programs`, `/api/sections`, `/api/subjects`, `/api/curriculum-rules`, `/api/academic-terms`
- Term transitions: `PATCH /api/academic-terms/:id/activate`, `PATCH /api/academic-terms/:id/complete`
- Classes: `/api/class-offerings` and `GET /api/class-offerings/:id/roster`
- Enrollment: `/api/enrollments`, `/api/enrollments/my`, and `/:id/approve`, `/:id/reject`, `/:id/withdraw`
- Grades: `/api/grades`, `/api/grades/my`, `PUT /api/grades/enrollment/:enrollmentId`, and grade status transitions
- Corrections: `/api/grade-correction-requests` and `/:id/approve`, `/:id/reject`
- Audit: `GET /api/audit-events` (admin only)

## Verification

```text
npm run lint
npm run test
npm run test:integration
npm run build
```

The integration suite uses `MONGODB_TEST_URI` when set, otherwise `mongodb://127.0.0.1:27017/`. It never uses the application's Atlas URI by default. It creates and drops uniquely named temporary test databases. It covers role restrictions, inactive accounts, duplicate accounts, academic relationships, concurrent seat approval, withdrawal accounting, grading permissions and calculation, publication visibility, correction history, and retakes.

## Project structure

- `src/components`, `src/layouts`, `src/pages`, `src/routes`, `src/context`, `src/hooks`, `src/services`: frontend UI and API client
- `server/src/models`: Mongoose collections
- `server/src/controllers`, `server/src/services`, `server/src/validators`: API behavior and business rules
- `server/src/routes`, `server/src/middleware`, `server/src/config`: routing, security, configuration
- `server/test`: API and MongoDB integration tests
