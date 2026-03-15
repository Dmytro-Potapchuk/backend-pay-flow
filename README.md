# 💳 PayFlow Backend API

Backend API for the **PayFlow** application.

This server handles payment flow logic, API routes, and communication with the frontend application.

---

## 🚀 Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![REST API](https://img.shields.io/badge/API-REST-blue)

---

## 📦 Features

- Payment flow handling
- REST API endpoints
- Express server architecture
- Modular structure
- Ready for frontend integration

---

## 📂 Project Structure

```
src
│
├── auth
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── dto
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── users
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.module.ts
│   ├── schemas
│   │   └── user.schema.ts
│   └── dto
│       └── update-user.dto.ts
│
├── transactions
│   ├── transactions.controller.ts
│   ├── transactions.service.ts
│   ├── transactions.module.ts
│   └── schemas
│       └── transaction.schema.ts
│
├── payu
│   ├── payu.service.ts
│   └── payu.module.ts
│
├── currency
│   ├── currency.controller.ts
│   ├── currency.service.ts
│   └── currency.module.ts
│
├── messages
│   ├── messages.controller.ts
│   ├── messages.service.ts
│   ├── messages.module.ts
│   └── schemas
│       └── message.schema.ts
│
├── common
│   ├── guards
│   │   └── jwt-auth.guard.ts
│   └── pipes
│       └── validation.pipe.ts
│
├── database
│   └── database.module.ts
│
└── main.ts
---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/Dmytro-Potapchuk/backend-pay-flow.git
```

Navigate to the project folder:

```bash
cd backend-pay-flow
```

Install dependencies:

```bash
npm install
```

---

## ▶️ Running the Server

Start the backend server:

```bash
npm start
```

or for development:

```bash
npm run dev
```

Server runs on:

```
http://localhost:3000
```

---

## 🔗 Frontend Repository

Frontend application:

https://github.com/Dmytro-Potapchuk/PayFlow

---

## 📸 API Example

Example request:

```
GET /api/payments
```

Example response:

```json
{
  "status": "success",
  "data": []
}
```

---

## 👨‍💻 Author

**Dmytro Potapchuk**

GitHub  
https://github.com/Dmytro-Potapchuk

---

## 📄 License

MIT
