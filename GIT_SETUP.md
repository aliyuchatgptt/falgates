# Git Setup and Push Instructions

## Step 1: Install Git (if not installed)

1. Download Git for Windows from: https://git-scm.com/download/win
2. Run the installer with default settings
3. Restart your terminal/command prompt after installation

## Step 2: Configure Git (First time only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Initialize and Push to GitHub

Run these commands in your project directory:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Falgates Rice Distribution Assigner"

# Add remote repository
git remote add origin https://github.com/aliyuchatgptt/falgates.git

# Push to GitHub (main branch)
git branch -M main
git push -u origin main
```

## Alternative: Using GitHub Desktop

If you prefer a GUI:
1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. File → Add Local Repository
4. Select this project folder
5. Click "Publish repository" and select the remote: `aliyuchatgptt/falgates`

## Troubleshooting

**If you get authentication errors:**
- Use a Personal Access Token instead of password
- Generate token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Use the token as password when prompted

**If remote already exists:**
```bash
git remote remove origin
git remote add origin https://github.com/aliyuchatgptt/falgates.git
```

