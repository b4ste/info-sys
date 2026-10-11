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

If you are using Command Prompt instead of PowerShell, use this copy command:

```bat
copy .env.local.example .env.local
```

The Vite development server proxies `/api` requests to the deployed Render
API, so the backend does not need to be run locally. Keep
`VITE_API_BASE_URL` empty in `.env.local`; this also keeps the session cookie
on `localhost` during local development.

If the deployed frontend also needs to call the API directly, Render's
`CLIENT_ORIGIN` environment variable must allow its URL. Multiple origins are
comma-separated, for example:

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

In Command Prompt, use:

```bat
copy .env.example .env
```

In another terminal:

```powershell
npm run dev
```
