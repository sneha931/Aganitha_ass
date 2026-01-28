# Paste Service Backend

A RESTful API service for creating and viewing text pastes with optional expiration and view limits. Built with Express.js, TypeScript, Prisma, and PostgreSQL.

## Features

- ✅ Create text pastes with optional TTL (time-to-live) and max views
- ✅ View pastes via API (JSON) or HTML page
- ✅ Automatic expiration based on TTL
- ✅ View count tracking and limits
- ✅ Safe HTML rendering (XSS protection)
- ✅ Environment-based URL configuration
- ✅ Health check endpoint
- ✅ Swagger API documentation
- ✅ Request logging with Morgan
- ✅ Security headers with Helmet

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database
- Git

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=8000
   DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
   
   # Optional: For production
   # BASE_URL=https://yourdomain.com
   ```

4. **Set up the database**
   
   Run Prisma migrations to create the database schema:
   ```bash
   npx prisma migrate dev
   ```
   
   Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode (`development` or `production`) | Yes | `development` |
| `PORT` | Server port number | Yes | `8000` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `BASE_URL` | Base URL for paste links (production only) | No | Auto-detected |

### Environment-Based URL Configuration

- **Development**: Automatically uses `http://localhost:{PORT}`
- **Production**: Uses `BASE_URL` environment variable if set, otherwise falls back to request-based URL

## Running the Project

### Development Mode

Run with auto-reload (watches for file changes):
```bash
npm run dev
```

This runs:
- TypeScript compiler in watch mode
- Nodemon server with auto-restart

### Production Mode

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

### Other Commands

- **Lint code**: `npm run lint`
- **Format code**: `npm run format`
- **Run lint + format**: `npm run fulltest`

## API Endpoints

### Base URL
- Development: `http://localhost:8000`
- Production: Your deployed domain

### Endpoints

#### 1. Health Check
```http
GET /api/healthcheck
```

**Response:**
```json
{
  "ok": true
}
```

#### 2. Create Paste
```http
POST /api/pastes
Content-Type: application/json

{
  "content": "Your paste content here",
  "ttl_seconds": 3600,      // Optional: expiration time in seconds
  "max_views": 10           // Optional: maximum number of views
}
```

**Response (201 Created):**
```json
{
  "id": "cmky7h2n00000vums0vv30kyx",
  "url": "http://localhost:8000/p/cmky7h2n00000vums0vv30kyx"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input (missing/invalid content, ttl_seconds, or max_views)
- `500 Internal Server Error`: Server error

#### 3. Get Paste (JSON)
```http
GET /api/pastes/:id
```

**Response (200 OK):**
```json
{
  "content": "Your paste content here",
  "remaining_views": 9,
  "expires_at": "2026-01-28T12:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid paste ID
- `404 Not Found`: Paste not found, expired, or view limit exceeded
- `500 Internal Server Error`: Server error

#### 4. View Paste (HTML)
```http
GET /p/:id
```

**Response (200 OK):**
Returns an HTML page with the paste content safely rendered.

**Error Responses:**
- `404 Not Found`: Paste not found, expired, or view limit exceeded

## Testing

### Manual Testing with cURL

1. **Create a paste:**
   ```bash
   curl -X POST http://localhost:8000/api/pastes \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Hello, World!",
       "ttl_seconds": 3600,
       "max_views": 5
     }'
   ```

2. **Get paste (JSON):**
   ```bash
   curl http://localhost:8000/api/pastes/{paste_id}
   ```

3. **View paste (HTML):**
   ```bash
   curl http://localhost:8000/p/{paste_id}
   ```
   Or open in browser: `http://localhost:8000/p/{paste_id}`

4. **Health check:**
   ```bash
   curl http://localhost:8000/api/healthcheck
   ```

### Testing with Postman/Thunder Client

1. Import the endpoints:
   - `POST /api/pastes` - Create paste
   - `GET /api/pastes/:id` - Get paste JSON
   - `GET /p/:id` - View paste HTML
   - `GET /api/healthcheck` - Health check

2. Test scenarios:
   - Create paste without expiration
   - Create paste with TTL
   - Create paste with max views
   - View paste multiple times (test view limit)
   - Try accessing expired paste
   - Try accessing non-existent paste

## API Documentation

Swagger UI documentation is available at:
```
http://localhost:8000/api-docs
```

## Database Schema

The `Paste` model has the following fields:

```prisma
model Paste {
  id        String   @id @default(cuid())
  content   String
  createdAt DateTime @default(now())
  expiresAt DateTime?
  maxViews  Int?
  views     Int      @default(0)
}
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── prismaconfig.ts    # Prisma client configuration
│   │   └── swagger.ts         # Swagger documentation config
│   ├── controllers/
│   │   └── past.controllers.ts  # API route handlers
│   ├── middlewares/
│   │   └── morganmiddleware.ts  # Request logging middleware
│   ├── routes/
│   │   └── pasteroutes.ts       # Route definitions
│   ├── index.ts                 # Application entry point
│   └── logger.ts                # Winston logger configuration
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── .env                         # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

### Deploying to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Add the following:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = Your production database URL
     - `BASE_URL` = Your production domain (e.g., `https://yourdomain.com`)

5. **Configure Vercel Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Environment Variables for Production

In Vercel, set:
- `NODE_ENV=production`
- `DATABASE_URL=<your-production-database-url>`
- `BASE_URL=<your-production-domain>` (e.g., `https://api.yourdomain.com`)

## Security Features

- **XSS Protection**: HTML content is escaped when rendering in the HTML view endpoint
- **Helmet**: Security headers are automatically added to all responses
- **CORS**: Cross-origin requests are handled securely
- **Input Validation**: All inputs are validated before processing

## Logging

The application uses Winston for logging. Logs include:
- Request/response information
- Database operations
- Errors and warnings
- Health check status

Logs are output to the console and can be configured for different environments.

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` is correct in `.env`
2. Ensure PostgreSQL is running
3. Check database credentials and permissions
4. Run `npx prisma migrate dev` to ensure schema is up to date

### Port Already in Use

If port 8000 is already in use:
1. Change `PORT` in `.env` to a different port
2. Or stop the process using port 8000

### Build Errors

1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript errors: `npm run lint`
3. Verify `tsconfig.json` is properly configured

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `npm run fulltest`
5. Submit a pull request
