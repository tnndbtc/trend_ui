# CORS Issue Fix Guide

## The Problem

Your API returns data when accessed directly (via curl or browser), but the UI shows no posts because of **CORS (Cross-Origin Resource Sharing)** blocking.

```
Browser Request: http://localhost:3000 → http://192.168.86.41:8002
Status: ❌ BLOCKED (Missing CORS headers)
```

## Why This Happens

Browsers block requests between different origins (different host/port) for security. Your crawler API needs to explicitly allow requests from the UI.

## The Solution

### Option 1: FastAPI (Python) - Recommended

If your crawler API uses FastAPI, add this middleware:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",           # Development
        "http://192.168.86.41:3000",       # Network access
        # Add your production URLs here
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your routes...
@app.get("/api/v1/trends")
async def get_trends():
    # ...
```

**For development, you can use `allow_origins=["*"]` to allow all origins.**

### Option 2: Express (Node.js)

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.86.41:3000'],
  credentials: true,
}));

// Your routes...
app.get('/api/v1/trends', (req, res) => {
  // ...
});
```

### Option 3: Manual Headers (Any Framework)

Add these headers to your API responses:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Client-Id
Access-Control-Allow-Credentials: true
```

### Option 4: Nginx Reverse Proxy

If you're using Nginx, add this to your server block:

```nginx
location /api/ {
    proxy_pass http://192.168.86.41:8002;

    # CORS headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, X-Client-Id' always;

    # Handle preflight
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

## Quick Test

After applying the fix, test with:

```bash
# Run the diagnostic script
./diagnose.sh

# Or manually check CORS headers
curl -I -H "Origin: http://localhost:3000" \
  http://192.168.86.41:8002/api/v1/trends?limit=1
```

You should see headers like:
```
access-control-allow-origin: http://localhost:3000
access-control-allow-credentials: true
```

## Verification Steps

1. ✅ Add CORS middleware to your crawler API
2. ✅ Restart the crawler service
3. ✅ Run `./diagnose.sh` to verify
4. ✅ Refresh the UI in your browser
5. ✅ Open browser console (F12) - no CORS errors
6. ✅ Data should now appear!

## Development vs Production

**Development** (allow all):
```python
allow_origins=["*"]
```

**Production** (specific origins):
```python
allow_origins=[
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

## Browser Console Check

Open browser DevTools (F12) → Console tab.

**Before fix (CORS error):**
```
❌ Access to fetch at 'http://192.168.86.41:8002/api/v1/trends'
   from origin 'http://localhost:3000' has been blocked by CORS policy
```

**After fix (success):**
```
✅ No CORS errors
✅ Network tab shows 200 OK responses
```

## Need More Help?

Run the diagnostic script:
```bash
./diagnose.sh
```

This will check:
- API connectivity
- Response format
- CORS configuration
- UI status

---

**Quick Fix Summary:**
Add CORS middleware → Restart API → Refresh UI → Done! 🎉
