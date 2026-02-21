# GitHub Repository Setup Guide

This guide will help you set up your GitHub repository and push your code.

## Step 1: Create a New Repository on GitHub

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the repository details:
   - **Repository name**: `dnd-rpg-game` (or your preferred name)
   - **Description**: "D&D RPG game with dungeon generation, monster segmentation, and AI story generation"
   - **Visibility**: Choose **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Add Remote and Push

After creating the repository, GitHub will show you instructions. Use these commands in your terminal:

### If your default branch is `main`:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### If your default branch is `master` (current):
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin master
```

**Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.**

## Step 3: Verify

After pushing, refresh your GitHub repository page. You should see all your files there!

## Future Updates

### Manual Method (Recommended)

When you make changes and want to push them:

1. **Stage your changes:**
   ```bash
   git add .
   ```
   Or stage specific files:
   ```bash
   git add path/to/file
   ```

2. **Commit your changes:**
   ```bash
   git commit -m "Description of your changes"
   ```
   Example:
   ```bash
   git commit -m "Added monster segmentation caching"
   ```

3. **Push to GitHub:**
   ```bash
   git push
   ```

### Using the Helper Script

You can also use the `push-to-github.bat` script for quick pushes:

1. Double-click `push-to-github.bat`
2. Or run it from terminal: `.\push-to-github.bat`

This will automatically stage, commit (with timestamp), and push your changes.

## Common Git Commands

### Check Status
```bash
git status
```
Shows which files have been modified, staged, or are untracked.

### View Changes
```bash
git diff
```
Shows the differences in your working directory.

### View Commit History
```bash
git log
```
Shows a list of all commits.

### Pull Latest Changes
```bash
git pull
```
Downloads and merges changes from GitHub (useful if working on multiple machines).

## Important Notes

- **Never commit sensitive information** like API keys or passwords. These are already in `.gitignore`.
- **Write clear commit messages** that describe what you changed and why.
- **Push regularly** to keep your code backed up on GitHub.

## Troubleshooting

### "Repository not found" error
- Check that you've added the correct remote URL
- Verify your GitHub username and repository name are correct
- Make sure you have access to the repository

### "Permission denied" error
- You may need to set up SSH keys or use a personal access token
- See GitHub's authentication guide: https://docs.github.com/en/authentication

### "Updates were rejected" error
- Someone else (or you on another machine) pushed changes
- Pull first: `git pull`, then push again: `git push`

## Need Help?

- GitHub Docs: https://docs.github.com
- Git Documentation: https://git-scm.com/doc

