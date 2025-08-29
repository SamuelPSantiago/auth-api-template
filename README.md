# Auth API Template

Secure authentication API template using Node.js, TypeScript, PostgreSQL, Prisma, JWT, and Nodemailer.

&nbsp;

## 🚀 Tecnologias utilizadas

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Express.js](https://expressjs.com)
- [Prisma ORM](https://www.prisma.io/)
- [JWT](https://jwt.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
- [Nodemailer](https://nodemailer.com/about/)
- [Jest](https://jestjs.io) (unit testing)

&nbsp;

## 🔐 Key Features

- ✅ Registration and login with JWT token generation for secure sessions
- 🔐 Secure password storage using Bcrypt with salt and hash
- ✉️ Password recovery via temporary code sent by email (configurable expiration)
- 🛡️ JWT protection middleware for authenticated routes, with automatic token verification
- 🧪 Unit tests implemented using Jest

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
NODE_ENV="development" or "production"

DATABASE_URL="postgresql://user:password@db:5432/mydb"
JWT_SECRET="your_secret_key"

EMAIL_HOST="smtp.yourprovider.com"
EMAIL_PORT="587"
EMAIL_USER="email@domain.com"
EMAIL_PASS="password"
EMAIL_FROM_NAME="Sender Name"
EMAIL_FROM_ADDRESS="email@domain.com"
```

&nbsp;

## 📦 Available Scripts

| Script              | Description                              |
|---------------------|------------------------------------------|
| npm run dev         | Starts the API in development mode       |
| npm run build       | Compiles TypeScript files                |
| npm run start       | Starts the API in production (`dist/`)   |
| npx run test        | Runs unit tests with Jest                |
| npx prisma studio   | Graphical interface for the database     |

&nbsp;

## 🐳 Docker

The project is ready to run with Docker and Docker Compose. To do this, simply run:

```
docker compose build
docker compose up
```

This will start the API and the PostgreSQL database automatically, with data persistence configured. Make sure to correctly fill in the `.env` file before starting the containers.

&nbsp;

## 👨‍💻 Author

**Samuel Pinheiro Santiago**  
Full Stack Developer - [LinkedIn](https://www.linkedin.com/in/samuel-pinheiro-santiago/)

