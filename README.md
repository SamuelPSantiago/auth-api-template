# Auth API Template

Secure authentication API template using Node.js, TypeScript, PostgreSQL, Prisma, JWT, and Nodemailer.

&nbsp;

## 🚀 Technologies used

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Express.js](https://expressjs.com)
- [Prisma ORM](https://www.prisma.io/)
- [JWT](https://jwt.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
- [Nodemailer](https://nodemailer.com/about/)
- [Handlebars](https://handlebarsjs.com/) - Email template engine
- [Zod](https://zod.dev/) - Data validation
- [Jest](https://jestjs.io/) - Unit testing
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js/) - Password hashing

&nbsp;

## 🔐 Key Features

- ✅ **User registration and login** with JWT token generation for secure sessions
- 🔄 **Refresh Token system** for automatic session renewal
- 🔐 **Secure password storage** using Bcrypt with salt and hash
- ✉️ **Advanced email system** with Handlebars templates, queue with retry logic, and preheader support
- 🔄 **Password recovery** via temporary code sent by email
- 🛡️ **JWT protection middleware** for authenticated routes
- 🔒 **Logout and bulk logout** with token revocation
- ⏱️ **Configurable expiration control** for tokens and reset codes
- 🚫 **Rate limiting** for spam prevention in password reset
- 📊 **Attempt tracking** and security logs
- 🧪 **Comprehensive unit tests** for all features

&nbsp;

## 🔄 Token System

### Access Token
- **Duration**: 15 minutes
- **Usage**: Authentication in requests
- **Storage**: Client (localStorage, cookies, etc.)

### Refresh Token
- **Duration**: 7 days
- **Usage**: Automatic access token renewal
- **Storage**: Database with device tracking
- **Security**: Individual and bulk revocation

&nbsp;

## ⚙️ Project Setup

### 1. Clone the repository

```
git clone https://github.com/SamuelPSantiago/auth-api-template.git
cd auth-api-template
```

### 2. `.env` File

Create a `.env` file based on the example:

```
# Environment
NODE_ENV="development" or "production"

# Database
DATABASE_URL="postgresql://user:password@db:5432/mydb"

# JWT Secrets
JWT_SECRET="your_access_token_secret_key"
JWT_REFRESH_SECRET="your_refresh_token_secret_key"

# Email Configuration
EMAIL_HOST="smtp.yourprovider.com"
EMAIL_PORT="587"
EMAIL_USER="email@domain.com"
EMAIL_PASS="password"
EMAIL_FROM_NAME="Sender Name"
EMAIL_FROM_ADDRESS="email@domain.com"
EMAIL_SECURE="false"  # true for 465, false for other ports
EMAIL_MAX_CONNECTIONS="5"
EMAIL_MAX_MESSAGES="100"
EMAIL_MAX_RETRIES="3"
EMAIL_RETRY_BASE_DELAY_MS="500"
EMAIL_QUEUE_INTERVAL_MS="200"

# Security Settings
BCRYPT_ROUNDS="12"
RESET_TTL_MINUTES="15"
MAX_REQUESTS_PER_HOUR_PER_EMAIL="3"
MAX_VERIFICATION_ATTEMPTS="5"
```

&nbsp;

## 📦 Available Scripts

| Script                  | Description                               |
|-------------------------|-------------------------------------------|
| npm run dev             | Starts the API in development mode        |
| npm run build           | Compiles TypeScript files                 |
| npm run start           | Starts the API in production (`dist/`)    |
| npm run test            | Runs unit tests                           |
| npm run test:watch      | Runs tests in watch mode                  |
| npm run prisma:studio   | Database GUI interface                    |
| npm run prisma:migrate  | Runs database migrations                  |

&nbsp;

## 📁 Project Structure

The project is organized in a modular and scalable way, separating responsibilities by domain:

```
src/
├── controllers/
│   ├── auth.controller.ts              # Authentication controller (register, login)
│   ├── refreshToken.controller.ts      # Refresh token controller
│   └── passwordReset.controller.ts     # Password reset controller
│
├── email/
│   ├── templates/                      # Handlebars email templates
│   │   ├── passwordReset.html          # Password reset template with preheader
│   │   └── register.html               # Welcome template with preheader
│   └── index.ts                        # Email service with Handlebars rendering
│
├── lib/
│   └── prisma.ts                       # Configured Prisma client
│
├── middlewares/
│   └── auth.middleware.ts              # JWT authentication middleware
│
├── routes/
│   ├── auth.routes.ts                  # Authentication routes
│   ├── refreshToken.routes.ts          # Refresh token routes
│   └── passwordReset.routes.ts         # Password reset routes
│
├── services/
│   ├── emailService.ts                 # Email sending service with validation
│   ├── emailQueue.ts                   # Email queue with retry logic and backoff
│   └── refreshTokenService.ts          # Refresh token management service
│
├── types/
│   ├── auth.ts                         # Authentication-related types
│   └── email.ts                        # Email-related types
│
├── utils/
│   ├── generateToken.ts                # Token generation and verification functions
│   ├── passwordReset.ts                # Password reset utilities
│   └── cleanupTokens.ts                # Automatic cleanup of expired tokens
│
└── index.ts                            # Main application entry point
```

&nbsp;

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Refresh Tokens
- `POST /auth/refresh` - Renew access token
- `POST /auth/logout` - Logout (revokes refresh token)
- `POST /auth/logout-all` - Bulk logout (revokes all tokens)

### Password Reset
- `POST /auth/request-reset` - Request password reset
- `POST /auth/verify-code` - Verify reset code
- `POST /auth/reset-password` - Set new password

&nbsp;

## 📧 Email System Features

### Template Engine
- **Handlebars** for secure variable interpolation with automatic escaping
- **Preheader support** for better email client preview
- **Template caching** in production, hot-reload in development
- **Automatic text generation** from HTML content

### Queue & Reliability
- **In-memory queue** with configurable processing interval
- **Exponential backoff** retry strategy with jitter
- **Configurable retry limits** and delays
- **Error logging** with detailed failure information

### Email Configuration
- **SMTP support** with connection pooling
- **Development mode** with JSON transport for testing
- **Flexible authentication** (optional for some providers)
- **Environment-based configuration**

&nbsp;

## 🛡️ Security Features

### Rate Limiting
- Maximum 3 reset requests per hour per email
- Maximum 5 code verification attempts
- Reset codes expire in 15 minutes (configurable)

### Security Tracking
- IP and User-Agent for each request
- Verification attempt history
- Token revocation logs
- Password versioning

&nbsp;

## 🐳 Docker

The project is ready to run with Docker and Docker Compose. To do this, simply run:

```
docker compose build
docker compose up
```

This will start the API and the PostgreSQL database automatically, with data persistence configured. Make sure to correctly fill in the `.env` file before starting the containers.

&nbsp;

## 🧪 Testing

The project includes a comprehensive unit test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- ✅ Authentication controllers
- ✅ Refresh token controllers
- ✅ Password reset controllers
- ✅ Authentication middlewares
- ✅ Validation utilities

&nbsp;

## 👨‍💻 Author

**Samuel Pinheiro Santiago**  

Full Stack Developer - [LinkedIn](https://www.linkedin.com/in/samuel-pinheiro-santiago/)
