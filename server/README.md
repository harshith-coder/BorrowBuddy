# BorrowBuddy server deployment

## Required configuration

Copy `.env.example` to `.env` and set `DBURL`, `JWT_SECRET`, `JWT_EXPIRE`,
`CORS_ORIGINS`, `PORT`, `HOST`, `BODY_LIMIT`, and `UPLOAD_DIR`.
Use a strong secret and never commit the real `.env` file.

`UPLOAD_DIR` controls persistent uploaded files. The directory must be writable and
must use persistent storage in deployments where uploads must survive restarts.

## Start commands

- Development: `npm run dev`
- Production: `NODE_ENV=production npm start`

The server connects to MongoDB before opening its HTTP listener. Startup fails if
the database or JWT configuration is unavailable. `GET /health` returns HTTP 200
when MongoDB is connected and HTTP 503 otherwise.

## Frontend

Set `VITE_API_URL` to the deployed backend API URL, including `/api`, then run
`npm run build` from the `client` directory. Configure the same frontend origin
in the backend `CORS_ORIGINS` value.
