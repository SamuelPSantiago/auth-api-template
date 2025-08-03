# Auth API Template

Template de API de autenticação segura usando Node.js, TypeScript, PostgreSQL, Prisma, JWT e Nodemailer.

&nbsp;

## 🚀 Tecnologias utilizadas

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Prisma ORM](https://www.prisma.io/)
- [JWT](https://jwt.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
- [Nodemailer](https://nodemailer.com/about/)

&nbsp;

## 🔐 Funcionalidades principais

- ✅ Registro e login com geração e retorno de token JWT para sessões seguras
- 🔐 Armazenamento seguro de senhas utilizando Bcrypt com sal e hash
- ✉️ Recuperação de senha via código temporário enviado por email (com expiração configurável)
- 🛡️ Middleware de proteção JWT para rotas autenticadas, com verificação automática de token

&nbsp;

## ⚙️ Configuração do projeto

### 1. Clone o repositório

```
git clone https://github.com/SamuelPSantiago/auth-api-template.git
cd auth-api-template
```

### 2. Arquivo `.env`

Crie um `.env` com base no exemplo:

```
DATABASE_URL="postgresql://user:password@db:5432/mydb"
JWT_SECRET="sua_chave_secreta"

EMAIL_HOST="smtp.seuprovedor.com"
EMAIL_PORT="587"
EMAIL_USER="email@dominio.com"
EMAIL_PASS="senha"
EMAIL_FROM_NAME="Nome do Remetente"
EMAIL_FROM_ADDRESS="email@dominio.com"
```

&nbsp;

## 📦 Scripts disponíveis

| Script              | Descrição                               |
|---------------------|-----------------------------------------|
| npm run dev         | Inicia a API em modo desenvolvimento    |
| npm run build       | Compila os arquivos TypeScript          |
| npm run start       | Inicia a API em produção (`dist/`)      |
| npx prisma studio   | Interface gráfica para banco de dados   |

&nbsp;

## 📁 Estrutura do Projeto

O projeto está organizado de forma modular e escalável, separando responsabilidades por domínio:

```
src/
├── controllers/
│   └── auth.controller.ts         # Controlador de autenticação (registro, login, etc.)
|
├── email/
│   ├── templates/                 # Templates HTML para emails
│   │   ├── passwordRecovery.html
│   │   └── register.html
│   └── index.ts                   # Monta os emails usando os templates
|
├── middlewares/
│   └── auth.middleware.ts         # Middleware de autenticação JWT
|
├── routes/
│   └── auth.ts
|
├── services/
│   └── emailService.ts            # Serviço de envio de emails via Nodemailer
|
├── types/
│   ├── auth.ts
│   └── email.ts
|
├── utils/
│   └── generateToken.ts           # Função de geração de token JWT
|
└── index.ts                       # Ponto de entrada principal da aplicação
```

&nbsp;

## 🐳 Docker

O projeto está preparado para rodar com Docker e Docker Compose. Para isso, basta executar:

```
docker compose build
docker compose up
```

Isso iniciará a API e o banco de dados PostgreSQL automaticamente, com persistência de dados configurada. Certifique-se de preencher corretamente o arquivo `.env` antes de subir os containers.

&nbsp;

## 👨‍💻 Autor

**Samuel Pinheiro Santiago**  
Desenvolvedor Full Stack - [LinkedIn](https://www.linkedin.com/in/samuel-pinheiro-santiago/)
