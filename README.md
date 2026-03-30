# Ethio-Books  📚
An advanced MERN stack educational platform designed for the Ethiopian curriculum. This system connects students (Grades 7-12) with verified tutors, featuring secure content streaming and a manual admin verification workflow.

# 🌟 Key Features
Tutor Verification Pipeline: New tutors are registered as pending. They only become visible to students once an Admin reviews their credentials and grants approved status.

Dual-Tier Content: Materials are filtered by grade level. Premium students gain unrestricted access to the entire library.

Secure Viewer: Integrated SecurePDFViewer and SecureVideoPlayer to protect intellectual property.

Deep Space UI: A high-end, corporate aesthetic using deep blues, blacks, and glowing accents.

# 🛠️ Tech Stack
Frontend: React.js, Tailwind CSS, Axios.

Backend: Node.js, Express.js.

Database: MongoDB (Mongoose ODM).

Authentication: JWT (JSON Web Tokens) with custom authMiddleware.

# ⚙️ Environment Setup
To make the project work, you must create a .env file in the /server directory. Without these variables, the authentication and database connection will fail.

Server .env Configuration
Code snippet
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_custom_secret_key
# 🚀 How to Run the Project
1. Prerequisite
Ensure you have Node.js and npm installed.

2. Backend Setup
Bash
cd server
npm install
npm run dev   # Runs on http://localhost:5000
3. Frontend Setup
Bash
cd client
npm install
npm start     # Runs on http://localhost:3000
# 🏗️ Project Architecture
Folder Structure
client/src/pages: Contains AdminDashboard, StudentDashboard, and TutorDashboard.

server/models: Defines User.js (Roles: student, tutor, admin) and Content.js.

server/controllers: Contains the logic for adminController (Approval/Rejection) and authController.

The Approval Workflow
Tutor Signs Up: Entry created with status: "pending".

Admin Review: Admin logs in, navigates to "Tutor Registrations," and reviews the docs array.

Status Update: Admin clicks Approve. The user's status updates to approved.

Visibility: The contentController.js now includes this tutor in the /api/content/tutors response.

# 🤝 Collaboration Rules
Git Protocol: NEVER push the node_modules or .env files. These are ignored via .gitignore to keep the repository lightweight and secure.

State Management: We use localStorage for JWT tokens. If you experience a "White Screen" on the /tutor or /student routes, clear your browser's local storage and log in again.

Database Changes: If you modify the User.js schema, notify the team as it impacts both the Admin and Tutor dashboards.
