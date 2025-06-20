# 🛠️ Project Management App – Backend

A RESTful API server built with **Node.js**, **Express**, and **MongoDB** for managing projects, tickets, and team collaboration—similar to tools like Jira and Linear. It supports authentication, ticket tracking, cloud-based image uploads, and email notifications.
---
🟢 **Live Backend URL**: [https://project-management-server-t25s.onrender.com](https://project-management-server-t25s.onrender.com)

---


## 🚀 Features

- 🔐 **User Authentication** (JWT-based)
- 📝 **Create and Manage Projects**
- 🐞 **Bug and Issue Tracking with Ticket System**
- 📂 **File Upload Support** (Cloudinary)
- 📬 **Email Notifications** via Nodemailer/Resend
- ⚙️ **Environment Variable Configuration**
- 🌐 **CORS Support** for Frontend Integration
- 📡 **RESTful API with async error handling**

---

## 🧰 Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** for authentication
- **Cloudinary** for image/file storage
- **Nodemailer** and **Resend** for email services
- **dotenv** for managing environment variables
- **bcrypt** for password hashing
- **Nodemon** for development

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/project-management-app.git
cd project-management-app/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables
Create a .env file in the root directory and add the following:
```bash
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=your_resend_api_key

```

### 4. Start the server
Development mode (with auto-reload):
```bash
npm run dev
```
Production mode:
```bash
npm start
```

### 📁 Folder Structure (Example)
```bash
server/
├── controllers/
├── routes/
├── models/
├── middlewares/
├── utils/
├── index.js
├── .env
└── package.json
```

### 📬 Email Setup
This project uses Resend to send emails ( password resets, notifications). Make sure credentials are set in the .env file.

### 🔒 Authentication
JWT is used for secure authentication. Tokens are sent in HTTP-only cookies for session persistence and XSS protection.

### 🌍 Sample API Endpoints
- POST /api/auth/register – Register a user

- POST /api/auth/login – Login user and get token

- POST /api/projects – Create a new project

- GET /api/projects – Get all projects

- POST /api/tickets – Report a bug/ticket

### 📦 Dependencies
```json

{
  "bcrypt": "^6.0.0",
  "cloudinary": "^2.6.1",
  "cors": "^2.8.5",
  "dotenv": "^16.5.0",
  "express": "^5.1.0",
  "express-async-handler": "^1.2.0",
  "express-fileupload": "^1.5.1",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.15.1",
  "nodemailer": "^7.0.3",
  "resend": "^4.5.2"
}
```
### 👥 Contributing
Contributions are welcome! Fork the repository and submit a pull request with your improvements.

