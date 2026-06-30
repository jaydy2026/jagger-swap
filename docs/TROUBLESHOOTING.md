# JAGGER SWAP - Troubleshooting Guide

This guide helps resolve common issues with JAGGER SWAP.

## Table of Contents

1. [Frontend Issues](#frontend-issues)
2. [Backend Issues](#backend-issues)
3. [Camera Issues](#camera-issues)
4. [Animation Issues](#animation-issues)
5. [Recording Issues](#recording-issues)
6. [Deployment Issues](#deployment-issues)

---

## Frontend Issues

### "Module not found" errors

**Symptom:** Build fails with module import errors.

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### White screen after deployment

**Symptom:** App loads but shows white screen.

**Solution:**
1. Check browser console for errors
2. Verify environment variables are set:
   ```bash
   echo $NEXT_PUBLIC_API_URL
   echo $NEXT_PUBLIC_WS_URL
   ```
3. Clear browser cache

### Slow page load

**Symptom:** Initial load takes more than 5 seconds.

**Solutions:**
- Enable Vercel edge caching
- Check bundle size: `npm run analyze`
- Optimize images
- Enable gzip compression

---

## Backend Issues

### API returns 500 errors

**Symptom:** API endpoints return 500 Internal Server Error.

**Debug:**
```bash
# Check logs
docker logs api

# Test health endpoint
curl http://localhost:8000/health

# Check detailed logs
curl http://localhost:8000/api/status
```

**Common causes:**
- Missing environment variables
- Database connection issues
- Import errors in Python code

### CORS errors

**Symptom:** `Access-Control-Allow-Origin` errors in console.

**Solution:**
Check `CORS_ORIGINS` in environment:
```bash
# Should include your frontend URL
echo $CORS_ORIGINS
# Example: https://jagger-swap.vercel.app,http://localhost:3000
```

### Port already in use

**Symptom:** `OSError: [Errno 98] Address already in use`

**Solution:**
```bash
# Find and kill the process
lsof -i :8000
kill -9 <PID>

# Or use a different port
PORT=8001 uvicorn app.main:app
```

---

## Camera Issues

### Camera not detected

**Symptom:** "Camera not found" or empty device list.

**Troubleshooting:**
1. Check browser permissions:
   - Chrome: `chrome://settings/content/camera`
   - Firefox: `about:preferences#privacy`
2. Test camera externally:
   - Visit `webcamtests.com`
   - Try in Incognito/Private mode
3. Check if camera is used by another app

### Camera permission denied

**Symptom:** Permission dialog not showing or denied.

**Solutions:**
1. Clear site data and reload
2. Check browser privacy settings
3. Ensure HTTPS (camera requires secure context)
4. Try different browser

### Camera disconnects during session

**Symptom:** Stream stops unexpectedly.

**Solutions:**
- Check USB connection if external webcam
- Close other apps using camera
- Reduce video resolution in Settings
- Implement auto-reconnect (automatic in Milestone 4)

---

## Animation Issues

### Portrait not animating

**Symptom:** Uploaded image stays static.

**Check:**
1. Is camera active? (green indicator)
2. Is portrait uploaded? (image visible)
3. Check browser console for errors
4. Try with debug overlay enabled

**Solutions:**
```typescript
// Enable debug in Settings panel
settings.debug.showDebugOverlay = true

// Check if MotionEngine is running
// Look for face/body landmarks in overlay
```

### Identity drift

**Symptom:** Portrait looks different over time.

**Solutions:**
- Increase smoothing level in Settings
- Reduce camera movement speed
- Ensure good lighting
- Check for tracking confidence in Diagnostics

### Flicker or jitter

**Symptom:** Animation jumps or flickers.

**Solutions:**
1. Increase smoothing level
2. Reduce FPS to stabilize
3. Improve lighting conditions
4. Check tracking confidence (should be >0.8)

### High latency

**Symptom:** Animation lags behind movement.

**Solutions:**
- Enable motion prediction (Settings > Quality)
- Reduce video resolution
- Close other browser tabs
- Use wired connection instead of WiFi

---

## Recording Issues

### Cannot start recording

**Symptom:** Record button disabled or fails.

**Check:**
1. Is animation active?
2. Check browser console for MediaRecorder errors
3. Verify canvas has content

**Solutions:**
```javascript
// Check if canvas has content
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, 1, 1);
console.log('Canvas has content:', imageData.data.some(v => v !== 0));
```

### Recording saves as .webm instead of .mp4

**Symptom:** Downloaded file is WebM format.

**Explanation:** 
Browser-native recording uses WebM/VP9. MP4 requires server-side transcoding.

**Solutions:**
- Use server-side export (planned for future)
- Convert locally using FFmpeg:
  ```bash
  ffmpeg -i recording.webm -c:v libx264 output.mp4
  ```

### Recording stops early

**Symptom:** Recording ends before user clicks stop.

**Check:**
- Max duration limit (default: 5 minutes)
- Browser storage quota
- Disk space on server (if server-side recording)

---

## Deployment Issues

### Docker container won't start

**Symptom:** `docker-compose up` fails.

**Debug:**
```bash
# Check container logs
docker-compose logs api

# Rebuild without cache
docker-compose build --no-cache

# Check if ports are available
netstat -tlnp | grep 8000
```

### GPU not accessible in Docker

**Symptom:** CUDA errors or no GPU detected.

**Solution:**
```bash
# Check NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi

# Install nvidia-container-toolkit
# Ubuntu:
sudo apt-get install nvidia-container-toolkit
sudo systemctl restart docker
```

### Vercel deployment fails

**Symptom:** GitHub Actions fails on Vercel deploy.

**Solutions:**
1. Verify Vercel tokens are valid
2. Check `vercel.json` configuration
3. Try manual deploy:
   ```bash
   cd frontend
   vercel --prod
   ```

### Environment variables not loading

**Symptom:** App uses default values instead of production settings.

**Solutions:**
```bash
# Vercel - set via dashboard
vercel env add NEXT_PUBLIC_API_URL

# Docker - check .env file
cat .env | grep API

# Check if variables are exposed (NEXT_PUBLIC_ prefix)
```

---

## Performance Issues

### High CPU usage

**Symptoms:**
- Fan spinning fast
- Browser becomes sluggish
- Other apps slow down

**Solutions:**
- Reduce animation quality
- Lower camera resolution
- Close other browser tabs
- Disable debug overlay

### Memory leak

**Symptom:** Browser memory grows over time.

**Solutions:**
- Refresh page periodically
- Report issue with browser console memory snapshot
- Check for unclosed WebSocket connections

### GPU not being used

**Symptom:** Animation uses CPU instead of GPU.

**Solutions:**
- Check if WebGL is enabled
- Update graphics drivers
- Try Chrome instead of Firefox

---

## Network Issues

### WebSocket connection fails

**Symptom:** Real-time updates don't work.

**Debug:**
```javascript
// Check WebSocket status
const ws = new WebSocket('wss://api.example.com/ws');
ws.onerror = (e) => console.error('WS Error:', e);
ws.onclose = (e) => console.log('WS Closed:', e);
```

**Solutions:**
- Check CORS headers
- Verify SSL certificate
- Test with `wscat`:
  ```bash
  npx wscat -c wss://api.example.com/ws
  ```

### High latency to server

**Symptom:** Slow API responses.

**Solutions:**
- Choose closer server region
- Enable CDN caching
- Use WebSocket instead of HTTP polling

---

## Getting Help

If issues persist:

1. Check the [GitHub Issues](https://github.com/jaydy2026/jagger-swap/issues)
2. Enable debug mode and capture:
   - Console logs
   - Network requests
   - Screenshot of the issue
3. Include in issue:
   - Browser and version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior

---

## Debug Mode

Enable comprehensive debugging:

```typescript
// In Settings > Debug tab
{
  showDebugOverlay: true,
  showFaceLandmarks: true,
  showBodySkeleton: true,
  showHandLandmarks: true,
  showPerformanceMetrics: true,
  logTrackingData: true
}
```

This will help identify:
- Tracking issues
- Performance bottlenecks
- Network problems
- State inconsistencies
