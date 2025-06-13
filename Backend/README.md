```markdown
# PreacherClan

[![GitHub Stars](https://img.shields.io/github/stars/Rheosta561/PreacherClan?style=social)](https://github.com/Rheosta561/PreacherClan)
[![GitHub Forks](https://img.shields.io/github/forks/Rheosta561/PreacherClan?style=social)](https://github.com/Rheosta561/PreacherClan)
[![GitHub Issues](https://img.shields.io/github/issues/Rheosta561/PreacherClan)](https://github.com/Rheosta561/PreacherClan/issues)
[![GitHub License](https://img.shields.io/github/license/Rheosta561/PreacherClan)](https://github.com/Rheosta561/PreacherClan/blob/master/LICENSE)

## Project Description

This is a centralised repository for the PreacherClan web application. It serves as the main source of truth for the project, encompassing all code, documentation, and related resources. This repository aims to facilitate collaboration, version control, and consistent development practices for the PreacherClan web application.

## About the Project

**PreacherClan** is a Viking-themed, community-driven fitness matchmaking platform designed to empower gym-goers and gym owners through interactive and gamified experiences.

Built to scale across **1,000+ gyms in 28 states**, PreacherClan connects users with compatible gym partners, fosters healthy competition, and enhances user engagement through a variety of innovative features:

### Core Features

- 🔄 **Swipe-Based Matchmaking**  
  Connect with gym partners based on fitness goals, workout preferences, and availability — promoting consistency and motivation.
  
- 📲 **QR-Based Workout Streak Tracking**  
  Scan QR codes at gym check-ins to maintain streaks and earn rewards.

- 🏆 **Dynamic Gym Leaderboards**  
  Drive friendly competition through real-time leaderboards showcasing top performers and most consistent members.

- 🎮 **B2B Gamified Tools for Gyms**  
  Equip gym owners with powerful promotional tools, gamification elements, and loyalty systems to boost memberships and engagement.

- 🔐 **Secure Google OAuth Login**  
  Provide users with a seamless and secure login experience using Google authentication.

- 📢 **Real-Time Notifications**  
  Keep users engaged with personalized notifications for milestones, gym events, and partner activity.

- 💳 **Integrated Membership Payments**  
  Handle payments and subscriptions through a secure, user-friendly interface.

- 🚀 **Designed for Scale**  
  Built using modern web technologies — **React, Next.js, Node.js, MongoDB** — and architected to support **1,000+ gyms and thousands of users**.


## Installation

To set up the PreacherClan web application locally, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Rheosta561/PreacherClan.git
    cd PreacherClan
    ```

2.  **Install dependencies:**

   

    ```bash
    npm install
    ```


3. **Configuration:**

You will need to set environment variables to securely store sensitive credentials such as API keys and authentication details.

- Copy the example environment file to `.env`:

    ```bash
    cp .env.example .env
    ```

- Open `.env` and update the following values with your own credentials:

    ```env
    # Google OAuth Credentials
    GOOGLE_CLIENT_ID=your-google-client-id
    GOOGLE_CLIENT_SECRET=your-google-client-secret

    # Gemini API Key
    GEMINI_API_KEY=your-gemini-api-key

    # Cloudinary API Keys
    CLOUDINARY_CLOUD_NAME=your-cloud-name
    CLOUDINARY_API_KEY=your-cloudinary-api-key
    CLOUDINARY_API_SECRET=your-cloudinary-api-secret

    # App Email and App Password (used for notifications or transactional emails)
    APP_EMAIL=your-email@example.com
    APP_PASSWORD=your-app-specific-password
    ```

- **Important:** Never commit your `.env` file to GitHub! It contains sensitive data.

---

4.  **Database Setup :**

    

    *   Create a database.
    *   Update the `.env` file with the database connection details.
    *   Run migrations .

## Usage

After installation and configuration, you can run the PreacherClan web application. The exact command will depend on the technology stack.





```bash
npm start
```



## Contributing

We welcome contributions to the PreacherClan project! To contribute:

1.  **Fork the repository.**
2.  **Create a new branch for your feature or bug fix:**

    ```bash
    git checkout -b feature/your-feature-name
    ```

3.  **Make your changes and commit them with descriptive commit messages.**
4.  **Push your branch to your forked repository:**

    ```bash
    git push origin feature/your-feature-name
    ```

5.  **Create a pull request to the `master` branch of the PreacherClan repository.**

Please ensure that your code adheres to the project's coding standards and includes appropriate tests.  We will review your pull request and provide feedback.

## License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
```
