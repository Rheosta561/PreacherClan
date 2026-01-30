require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIG ---
const GITHUB_REPO_OWNER = 'your-github-username';
const GITHUB_REPO_NAME = 'your-repo-name';
// --------------

// Setup Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function fetchGitHubRepoInfo() {
  const url = `https://api.github.com/repos/Rheosta561/Automark-Backend`;
  
  const response = await axios.get(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'auto-readme-generator',
    },
  });
  console.log(response.data)

  return response.data;
}

async function generateReadme(repoData) {
  const prompt = `
You are an expert GitHub README writer.

Generate a professional README.md for this project based on the following data:
Repository Author : Anubhav Mishra (Rheosta561)

Repository Name: ${repoData.name}
Description: ${repoData.description}

URL: ${repoData.html_url}
Stars: ${repoData.stargazers_count}
Forks: ${repoData.forks_count}
Open Issues: ${repoData.open_issues_count}
Default Branch: ${repoData.default_branch}

Please include:
- Title
- Project Description
- Installation instructions
- Usage
- Contributing
- License
- Badges if appropriate
- Example code block if possible

Write in markdown format. Don't include any personal remarks.
`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  return text;
}

async function main() {
  try {
    console.log('Fetching repo info...');
    const repoData = await fetchGitHubRepoInfo();

    console.log('Generating README with Gemini...');
    const readme = await generateReadme(repoData);

    fs.writeFileSync('AutmarkReadme.md', readme);
    console.log('✅ README.md generated successfully!');
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

main();
