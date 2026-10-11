# Student Information System

## Run the deployed API from a local frontend

This is the setup for contributors who need to run the UI locally while using
the shared Render API and database. It does not require the backend secrets or
a local MongoDB instance.

```powershell
git clone <repository-url>
cd student-infosys
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Open `http://localhost:5173` and use the accounts from the deployed
application.

The deployed API must allow `http://localhost:5173` in Render's
`CLIENT_ORIGIN` environment variable. Multiple origins are comma-separated,
for example:

```text
https://your-app.vercel.app,http://localhost:5173
```

## Run the entire application locally

Copy `.env.example` to `.env` and provide your own MongoDB connection string
and JWT secret. Never commit `.env` or share its values.

```powershell
Copy-Item .env.example .env
npm run server:dev
```

In another terminal:

```powershell
npm run dev
```
