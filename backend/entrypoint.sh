#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
python << 'PYEOF'
import socket, time, os
host = os.environ.get("POSTGRES_HOST", "db")
port = int(os.environ.get("POSTGRES_PORT", "5432"))
print(f"  Connecting to {host}:{port}...")
for i in range(30):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, port))
        s.close()
        print("  Connected!")
        break
    except Exception:
        time.sleep(2)
else:
    print("  ERROR: Could not connect to PostgreSQL")
    exit(1)
PYEOF
echo "PostgreSQL is ready."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding default user..."
python manage.py seed_user

echo "Starting: $@"
exec "$@"
