# Troubleshooting Guide

Common issues and solutions for QuantumVest.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Database Issues](#database-issues)
- [API Issues](#api-issues)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### Python Module Not Found

**Symptom:**

```text
ModuleNotFoundError: No module named 'flask'
```

**Solution:**

```bash
# Ensure virtual environment is activated
cd code/backend
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Reinstall requirements
pip install -r requirements.txt
```

---

### Port Already in Use

**Symptom:**

```text
OSError: [Errno 48] Address already in use
```

**Solution:**

```bash
# Find process using port
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 PID  # Mac/Linux
taskkill /PID PID /F  # Windows

# Or use different port
FLASK_PORT=8000 python app.py
```

---

## Backend Issues

### Database Connection Failed

**Symptom:**

```text
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # Mac

# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql  # Mac

# Verify connection string
echo $DATABASE_URL

# Test connection
psql -U quantumvest -d quantumvest -h localhost
```

---

### JWT Token Expired

**Symptom:**

```json
{
  "success": false,
  "error": "Token has expired"
}
```

**Solution:**

```python
# Use refresh token to get new access token
response = requests.post(
    'http://localhost:5000/api/v1/auth/refresh',
    json={'refresh_token': refresh_token}
)
new_access_token = response.json()['access_token']
```

---

### Import Errors

**Symptom:**

```text
ImportError: attempted relative import with no known parent package
```

**Solution:**

```bash
# Run from correct directory
cd code/backend

# Use module syntax
python -m data_pipeline.data_fetcher

# Or add to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

---

## Frontend Issues

### npm Install Fails

**Symptom:**

```bash
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Use legacy peer deps
npm install --legacy-peer-deps

# Or delete node_modules and retry
rm -rf node_modules package-lock.json
npm install
```

---

### CORS Errors

**Symptom:**

```text
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**

In backend `.env`:

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

Or for development:

```bash
CORS_ORIGINS=*
```

---

## Database Issues

### Migration Conflicts

**Symptom:**

```text
alembic.util.exc.CommandError: Target database is not up to date
```

**Solution:**

```bash
cd code/backend

# Check current version
flask db current

# Apply all migrations
flask db upgrade

# If conflicts persist, reset migrations
flask db downgrade base
flask db upgrade
```

---

### Database Lock

**Symptom:**

```text
psycopg2.OperationalError: database is locked
```

**Solution:**

```sql
-- Check for hanging connections
SELECT * FROM pg_stat_activity WHERE datname='quantumvest';

-- Kill hanging connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname='quantumvest' AND pid <> pg_backend_pid();
```

Then restart PostgreSQL if the problem persists:

```bash
sudo systemctl restart postgresql
```

---

## API Issues

### 429 Rate Limit Exceeded

**Symptom:**

```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

**Solution:**

1. Wait for rate limit reset (check `X-RateLimit-Reset` header)
2. Upgrade to higher tier
3. Implement exponential backoff:

```python
import time

def api_call_with_retry(url, max_retries=3):
    for attempt in range(max_retries):
        response = requests.get(url)
        if response.status_code == 429:
            wait_time = 2 ** attempt
            time.sleep(wait_time)
            continue
        return response
    raise Exception("Max retries exceeded")
```

---

### External API Failures

**Symptom:**

```text
Unable to fetch data from Alpha Vantage API
```

**Solution:**

```bash
# Verify API key is set
echo $ALPHA_VANTAGE_API_KEY

# Test API key
curl "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=$ALPHA_VANTAGE_API_KEY"

# Check rate limits (Alpha Vantage free tier: 5 calls/minute)
```

---

## Performance Issues

### Slow API Responses

**Symptom:**
API calls taking > 5 seconds

**Solutions:**

1. **Check Redis cache:**

```bash
redis-cli ping
redis-cli INFO stats
```

1. **Enable query logging:**

```python
# In config.py
SQLALCHEMY_ECHO = True
```

1. **Add database indexes:**

```sql
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_assets_symbol ON assets(symbol);
```

1. **Optimize queries:**

```python
# Use eager loading
query = Portfolio.query.options(
    joinedload(Portfolio.positions)
).filter_by(user_id=user_id)
```

---

### Memory Issues

**Symptom:**

```text
MemoryError: Unable to allocate array
```

**Solutions:**

1. **Process data in chunks:**

```python
# Instead of loading all data at once
chunk_size = 1000
for chunk in pd.read_csv('data.csv', chunksize=chunk_size):
    process(chunk)
```

1. **Increase worker memory:**

```bash
# Gunicorn
gunicorn --workers 2 --worker-class gevent --timeout 120 app:app
```

1. **Use connection pooling:**

```python
# In config.py
SQLALCHEMY_POOL_SIZE = 10
SQLALCHEMY_MAX_OVERFLOW = 20
```

---

## Logging and Debugging

### Enable Debug Mode

**Backend:**

```bash
FLASK_ENV=development
DEBUG=True
LOG_LEVEL=DEBUG
```

**Check logs:**

```bash
# Application logs
tail -f /var/log/quantumvest/app.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log

# Redis logs
tail -f /var/log/redis/redis-server.log
```

### Debug API Requests

Use verbose curl:

```bash
curl -v http://localhost:5000/api/v1/health
```

Use httpie:

```bash
http -v GET localhost:5000/api/v1/portfolios "Authorization: Bearer TOKEN"
```

---

## Getting More Help

If issues persist:

1. **Check logs** in `/var/log/quantumvest/`
2. **Search issues** on GitHub
3. **Open new issue** with:
   - System information
   - Error messages
   - Steps to reproduce
   - Log excerpts

---

For more information:

- [Installation Guide](INSTALLATION.md)
- [Configuration Guide](CONFIGURATION.md)
- [Developer Guide](CONTRIBUTING.md)
