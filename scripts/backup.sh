#!/bin/bash
# Phase 11 - Automated PostgreSQL Backups

# Default variables
BACKUP_DIR="/var/backups/possd"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/possd_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=30
DB_URL=${DATABASE_URL:-"postgres://user:pass@localhost:5432/possd"}

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Starting POSSD PostgreSQL backup at $TIMESTAMP..."

# Perform the backup
# Note: In a real environment, pg_dump should be installed.
if command -v pg_dump >/dev/null 2>&1; then
    pg_dump "$DB_URL" -F c -f "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup successfully created at $BACKUP_FILE"
    else
        echo "❌ Backup failed."
        exit 1
    fi
else
    echo "⚠️ pg_dump is not installed. Please install postgresql-client to run this script natively."
    echo "If running in Docker, you can use: docker exec <db_container> pg_dump -U postgres possd > $BACKUP_FILE"
    exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "possd_backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete

echo "✅ Backup process complete."
