# Quick Setup - Enable DEV_MODE

## The Problem
Firebase Admin SDK can't initialize without credentials, causing the error:
```
firebase admin sdk not initialized
```

## The Solution
Enable **DEV_MODE** to skip Firebase for local development.

---

## 📝 Step 1: Create `.env` File

In your `backend/` folder, create a file named `.env` with these contents:

```bash
PORT=8080
HUNTER_API_KEY=627abb0bf3e7db9486e0a496b63f254145ccba5c
OPENAI_API_KEY=your-openai-api-key-here
DEV_MODE=true
```

### Quick Create (Copy & Paste in Terminal):

**Windows PowerShell:**
```powershell
cd backend
"PORT=8080`nHUNTER_API_KEY=627abb0bf3e7db9486e0a496b63f254145ccba5c`nOPENAI_API_KEY=your-openai-api-key-here`nDEV_MODE=true" | Out-File -FilePath .env -Encoding UTF8
```

**Mac/Linux/Git Bash:**
```bash
cd backend
cat > .env << 'EOF'
PORT=8080
HUNTER_API_KEY=627abb0bf3e7db9486e0a496b63f254145ccba5c
OPENAI_API_KEY=your-openai-api-key-here
DEV_MODE=true
EOF
```

---

## 🔑 Step 2: Add Your OpenAI Key

1. Get your API key from: https://platform.openai.com/api-keys
2. Open `backend/.env` in your text editor
3. Replace `your-openai-api-key-here` with your actual key:

```bash
OPENAI_API_KEY=sk-proj-abc123xyz...
```

---

## 🚀 Step 3: Restart Server

```bash
cd backend
npm run dev
```

---

## ✅ You Should See:

```
✅ Outreach Agent Backend running on port 8080
📡 API available at http://localhost:8080
🔧 DEV_MODE enabled: Skipping Firebase initialization
⚠️  DEV_MODE: Skipping authentication (mock user)
```

**No more Firebase errors!** ✨

---

## 🎯 What DEV_MODE Does

When `DEV_MODE=true`:
- ✅ Skips Firebase Admin SDK initialization
- ✅ No Google/Firebase credentials needed
- ✅ Creates mock user for authentication
- ✅ Perfect for local testing
- ✅ Your Dashboard works immediately!

---

## 📂 Verify .env File Exists

Check if `.env` was created:

**Windows:**
```cmd
cd backend
dir .env
```

**Mac/Linux:**
```bash
cd backend
ls -la .env
```

You should see the file listed.

---

## ❓ Troubleshooting

### Still seeing errors?
1. Make sure `.env` file exists in `backend/` folder
2. Verify `DEV_MODE=true` is in the file
3. Completely stop the server (Ctrl+C) and restart: `npm run dev`
4. Check you're running from the `backend/` folder

### Can't create .env file?
- On Windows: Open Notepad, save as `.env` (with quotes)
- Use VS Code: Right-click backend folder → New File → name it `.env`
- Or copy from `.env.example` if it exists

### Permission denied?
- Run terminal as administrator (Windows)
- Use `sudo` on Mac/Linux if needed

---

## 🔜 For Production Later

When deploying:
1. Set `DEV_MODE=false` or remove it
2. Add proper Firebase credentials
3. Enable real authentication

But for now, **DEV_MODE=true** is perfect for development!

---

## 🎉 That's It!

After creating `.env` with `DEV_MODE=true` and restarting:
- ✅ No Firebase errors
- ✅ Server starts successfully
- ✅ Ready to test your Dashboard!
- ✅ Hunter.io API works!

---

**Test it:**
```bash
# Start backend
cd backend
npm run dev

# In another terminal, test
curl http://localhost:8080/api/hello
```

Should return: `{"message":"Backend is running!"}`

🎊 You're ready to go!

