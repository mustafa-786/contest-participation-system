Installation Steps:

Clone the repository:

git clone https://github.com/mustafa-786/contest-participation-system.git
Navigate to the project folder:

cd contest-participation-system
Open the project in your preferred code editor.

Install dependencies:

npm install
Copy the environment file:

cp .env.example .env
Database Setup:

Create the database:

CREATE DATABASE contestdb;
Run migrations:

npx db-migrate up
Seed roles:

npm run seed:roles
Run the Application:

npm run dev
Endpoints Overview:

Category	Method	Endpoint	Description
Users	POST	/api/auth/signup	Signup
Users	POST	/api/auth/login	Login
Contests	POST	/api/contests	Create a new contest with questions (accessLevel can be normal or vip)
Contests	GET	/api/contests	Get all contests
Contests	GET	/api/contests/:id	Get single contest
Contests	POST	/api/participation/join/:contestId	Join contest
Contests	POST	/api/participation/submit/:contestId	Submit answers
Submissions	POST	/api/submissions	Submit user answers (questionId from questions table)
Leaderboard	GET	/api/leaderboard/:contestId	Show all users’ scores for a specific contest
User History	GET	/api/users/:userId/history	Show contests a user participated in, their scores, and prizes won
Additional Notes:

There is a cron job in index.js called finalizeExpiredContests that runs every 10 minutes to automatically finalize contests and distribute prizes.

I have also attached the Postman collection for testing all endpoints.