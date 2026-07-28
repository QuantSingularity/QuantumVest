#!/bin/bash
# QuantumVest Maintenance Automation Script
# This script automates maintenance tasks including log rotation, backups, and health monitoring

# Exit immediately if a command exits with a non-zero status
set -e

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}QuantumVest Maintenance Automation Script${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Parses a postgresql://user:pass@host:port/dbname URL (as used by
# code/backend/.env's DATABASE_URL) into DB_USER/DB_PASS/DB_HOST/DB_PORT/DB_NAME.
# Returns non-zero if $1 isn't a postgresql:// URL.
parse_postgres_uri() {
  local uri="$1"
  case "$uri" in
    postgresql://*) ;;
    *) return 1 ;;
  esac
  DB_USER=$(echo "$uri" | sed -E 's#postgresql://([^:]+):.*#\1#')
  DB_PASS=$(echo "$uri" | sed -E 's#postgresql://[^:]+:([^@]+)@.*#\1#')
  DB_HOST=$(echo "$uri" | sed -E 's#postgresql://[^@]+@([^:/]+).*#\1#')
  DB_PORT=$(echo "$uri" | sed -E 's#postgresql://[^@]+@[^:/]+:([0-9]+).*#\1#')
  DB_NAME=$(echo "$uri" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')
  [ -n "$DB_PORT" ] || DB_PORT=5432
}

# Function to rotate logs
rotate_logs() {
  echo -e "\n${BLUE}Rotating logs...${NC}"

  # Create logs directories if they don't exist (including the archive
  # directory — the "compress"/"delete old" steps below run unconditionally
  # even when no log files were found to rotate this time around).
  mkdir -p logs logs/archive

  # Check for log files in common locations
  LOG_FILES=(
    "code/backend/logs/*.log"
    "web-frontend/logs/*.log"
    "logs/*.log"
  )

  # Rotate each log file
  for pattern in "${LOG_FILES[@]}"; do
    for log_file in $pattern; do
      # Skip if the pattern doesn't match any files
      [ -e "$log_file" ] || continue

      echo -e "${BLUE}Rotating log file: $log_file${NC}"

      # Get base name of log file
      base_name=$(basename "$log_file")

      # Create timestamp
      timestamp=$(date +"%Y%m%d-%H%M%S")

      # Copy log file to archive with timestamp
      cp "$log_file" "logs/archive/${base_name%.*}-$timestamp.${base_name##*.}"

      # Clear original log file
      echo "" > "$log_file"
    done
  done

  # Compress logs older than 7 days
  echo -e "${BLUE}Compressing old logs...${NC}"
  find logs/archive -type f -name "*.log" -mtime +7 -exec gzip {} \;

  # Delete logs older than 30 days
  echo -e "${BLUE}Deleting logs older than 30 days...${NC}"
  find logs/archive -type f -name "*.gz" -mtime +30 -delete

  echo -e "${GREEN}Log rotation completed.${NC}"
}

# Function to backup data
backup_data() {
  echo -e "\n${BLUE}Backing up data...${NC}"

  # Create backup directory if it doesn't exist
  BACKUP_DIR="backups"
  mkdir -p "$BACKUP_DIR"

  # Create timestamp
  TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

  # Backup database
  echo -e "${BLUE}Backing up database...${NC}"

  # The application reads its DB connection string from code/backend/.env's
  # DATABASE_URL (see config.py) — not a top-level .env, which nothing in
  # the app actually consumes.
  if [ -f "code/backend/.env" ]; then
    DB_URL=$(grep -m1 '^DATABASE_URL=' code/backend/.env | cut -d= -f2-)

    if [ -n "$DB_URL" ] && parse_postgres_uri "$DB_URL"; then
      if command_exists pg_dump; then
        PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_DIR/db-$TIMESTAMP.sql"

        # Compress the backup
        gzip "$BACKUP_DIR/db-$TIMESTAMP.sql"

        echo -e "${GREEN}Database backup completed: $BACKUP_DIR/db-$TIMESTAMP.sql.gz${NC}"
      else
        echo -e "${YELLOW}pg_dump not found. Skipping database backup.${NC}"
      fi
    else
      echo -e "${YELLOW}DATABASE_URL in code/backend/.env is not a postgresql:// URL (e.g. sqlite). Skipping pg_dump backup.${NC}"
    fi
  else
    echo -e "${YELLOW}code/backend/.env not found. Skipping database backup.${NC}"
  fi

  # Backup code and configuration
  echo -e "${BLUE}Backing up code and configuration...${NC}"

  # Create a list of directories to backup
  BACKUP_DIRS=(
    "code"
    "docs"
    ".github"
    "infrastructure"
    "web-frontend"
    "mobile-frontend"
  )

  # Create a list of files to backup
  BACKUP_FILES=(
    "code/backend/.env"
    "web-frontend/.env"
    "infrastructure/.env"
    "docker-compose.yml"
    "README.md"
  )

  # Create a temporary directory for the backup
  TEMP_DIR=$(mktemp -d)

  # Copy directories
  for dir in "${BACKUP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      cp -r "$dir" "$TEMP_DIR/"
    fi
  done

  # Copy files (preserving their relative directory structure)
  for file in "${BACKUP_FILES[@]}"; do
    if [ -f "$file" ]; then
      mkdir -p "$TEMP_DIR/$(dirname "$file")"
      cp "$file" "$TEMP_DIR/$file"
    fi
  done

  # Create tar archive
  tar -czf "$BACKUP_DIR/code-$TIMESTAMP.tar.gz" -C "$TEMP_DIR" .

  # Remove temporary directory
  rm -rf "$TEMP_DIR"

  echo -e "${GREEN}Code and configuration backup completed: $BACKUP_DIR/code-$TIMESTAMP.tar.gz${NC}"

  # Delete backups older than 30 days
  echo -e "${BLUE}Deleting backups older than 30 days...${NC}"
  find "$BACKUP_DIR" -type f -name "*.gz" -mtime +30 -delete

  echo -e "${GREEN}Backup completed.${NC}"
}

# Function to check system health
check_health() {
  echo -e "\n${BLUE}Checking system health...${NC}"

  # Create health check directory if it doesn't exist
  HEALTH_DIR="health_checks"
  mkdir -p "$HEALTH_DIR"

  # Create timestamp
  TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

  # Create health check report file
  HEALTH_REPORT="$HEALTH_DIR/health-$TIMESTAMP.txt"

  # Write header to health report
  {
    echo "QuantumVest Health Check Report"
    echo "Date: $(date)"
    echo "----------------------------------------"
  } > "$HEALTH_REPORT"

  # Check disk usage
  echo -e "${BLUE}Checking disk usage...${NC}"
  {
    echo ""
    echo "Disk Usage:"
    df -h
  } >> "$HEALTH_REPORT"

  # Check memory usage
  echo -e "${BLUE}Checking memory usage...${NC}"
  {
    echo ""
    echo "Memory Usage:"
    free -h
  } >> "$HEALTH_REPORT"

  # Check CPU usage
  echo -e "${BLUE}Checking CPU usage...${NC}"
  {
    echo ""
    echo "CPU Usage:"
    top -bn1 | head -20
  } >> "$HEALTH_REPORT"

  # Check running processes. The trailing "|| true" matters: if none of
  # these processes happen to be running (e.g. a minimal/CI environment),
  # the final grep in the pipeline returns 1, which would otherwise abort
  # the whole script under `set -e`.
  echo -e "${BLUE}Checking running processes...${NC}"
  {
    echo ""
    echo "Running Processes:"
    ps aux | grep -E 'python|node|nginx|postgres|redis|mysql' | grep -v grep || echo "(none found)"
  } >> "$HEALTH_REPORT"

  # Check Docker containers if Docker is installed
  if command_exists docker; then
    echo -e "${BLUE}Checking Docker containers...${NC}"
    {
      echo ""
      echo "Docker Containers:"
      docker ps -a
    } >> "$HEALTH_REPORT"
  fi

  # Check database connection
  echo -e "${BLUE}Checking database connection...${NC}"
  echo -e "\nDatabase Connection:" >> "$HEALTH_REPORT"

  # See the note in backup_data(): the real DB config lives in
  # code/backend/.env's DATABASE_URL.
  if [ -f "code/backend/.env" ]; then
    DB_URL=$(grep -m1 '^DATABASE_URL=' code/backend/.env | cut -d= -f2-)

    if [ -n "$DB_URL" ] && parse_postgres_uri "$DB_URL"; then
      if command_exists psql; then
        if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
          echo "Database connection successful." >> "$HEALTH_REPORT"
        else
          echo "Database connection failed." >> "$HEALTH_REPORT"
        fi
      else
        echo "psql not found. Could not check database connection." >> "$HEALTH_REPORT"
      fi
    else
      echo "DATABASE_URL is not a postgresql:// URL (e.g. sqlite) — skipping connection check." >> "$HEALTH_REPORT"
    fi
  else
    echo "code/backend/.env not found. Could not check database connection." >> "$HEALTH_REPORT"
  fi

  # Check API endpoints
  echo -e "${BLUE}Checking API endpoints...${NC}"
  echo -e "\nAPI Endpoints:" >> "$HEALTH_REPORT"

  # Check if curl is installed
  if command_exists curl; then
    # Check backend API. The health route is served under the /api/v1
    # blueprint prefix, not at the bare path. Direct-mode deploys (gunicorn
    # --bind 0.0.0.0:8000) and Docker-mode deploys (infra compose maps
    # backend to 8080) use different ports, so try both.
    backend_ok="false"
    for port in 8000 8080; do
      if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/api/v1/health" 2>/dev/null | grep -q "200"; then
        echo "Backend API is up and running (port ${port})." >> "$HEALTH_REPORT"
        backend_ok="true"
        break
      fi
    done
    [ "$backend_ok" = "true" ] || echo "Backend API is not responding on port 8000 or 8080." >> "$HEALTH_REPORT"

    # Check frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
      echo "Frontend is up and running." >> "$HEALTH_REPORT"
    else
      echo "Frontend is not responding." >> "$HEALTH_REPORT"
    fi
  else
    echo "curl not found. Could not check API endpoints." >> "$HEALTH_REPORT"
  fi

  echo -e "${GREEN}Health check completed. Report saved to $HEALTH_REPORT${NC}"

  # Display summary
  echo -e "\n${BLUE}Health Check Summary:${NC}"
  echo -e "${BLUE}----------------------------------------${NC}"

  # Check disk usage warning. Targeting "/" explicitly (rather than
  # grepping for a line ending in "/") avoids matching zero or multiple
  # lines in containers with several mount points, which would otherwise
  # make the numeric comparison below error out.
  disk_usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
  if [ -n "$disk_usage" ] && [ "$disk_usage" -gt 90 ] 2>/dev/null; then
    echo -e "${RED}WARNING: Disk usage is high ($disk_usage%).${NC}"
  else
    echo -e "${GREEN}Disk usage is normal (${disk_usage:-unknown}%).${NC}"
  fi

  # Check memory usage warning
  memory_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
  if [ -n "$memory_usage" ] && [ "$memory_usage" -gt 90 ] 2>/dev/null; then
    echo -e "${RED}WARNING: Memory usage is high ($memory_usage%).${NC}"
  else
    echo -e "${GREEN}Memory usage is normal (${memory_usage:-unknown}%).${NC}"
  fi

  # Check if any critical services are down
  if grep -q "not responding\|failed\|not found" "$HEALTH_REPORT"; then
    echo -e "${RED}WARNING: Some services are not responding. Check the health report for details.${NC}"
  else
    echo -e "${GREEN}All services appear to be running normally.${NC}"
  fi
}

# Function to display help
show_help() {
  echo -e "${BLUE}Usage: $0 [options]${NC}"
  echo -e "${BLUE}Options:${NC}"
  echo -e "  ${GREEN}-h, --help${NC}        Show this help message"
  echo -e "  ${GREEN}-l, --logs${NC}        Rotate logs only"
  echo -e "  ${GREEN}-b, --backup${NC}      Backup data only"
  echo -e "  ${GREEN}-c, --check${NC}       Check system health only"
  echo -e "  ${GREEN}-a, --all${NC}         Perform all maintenance tasks (default)"
}

# Main function
main() {
  # Get the project directory
  PROJECT_DIR=$(pwd)

  echo -e "${BLUE}Project directory: $PROJECT_DIR${NC}"

  # Check if we're in the QuantumVest directory
  if [ ! -f "README.md" ] || ! grep -q "QuantumVest" "README.md"; then
    echo -e "${RED}Error: This doesn't appear to be the QuantumVest project directory.${NC}"
    echo -e "${YELLOW}Please run this script from the root of the QuantumVest project.${NC}"
    exit 1
  fi

  # Parse command line arguments
  if [ $# -eq 0 ]; then
    # No arguments, perform all maintenance tasks
    rotate_logs
    backup_data
    check_health
  else
    while [ $# -gt 0 ]; do
      case "$1" in
        -h|--help)
          show_help
          exit 0
          ;;
        -l|--logs)
          rotate_logs
          ;;
        -b|--backup)
          backup_data
          ;;
        -c|--check)
          check_health
          ;;
        -a|--all)
          rotate_logs
          backup_data
          check_health
          ;;
        *)
          echo -e "${RED}Unknown option: $1${NC}"
          show_help
          exit 1
          ;;
      esac
      shift
    done
  fi

  echo -e "\n${GREEN}QuantumVest maintenance tasks completed!${NC}"
}

# Run the main function with all arguments
main "$@"
