#!/bin/bash
# Start the Discord command listener as a background process
# Restarts automatically if it crashes

PROJECT_DIR="/home/agent/projects/viral-tweets-monitor"
LOG_FILE="/home/agent/.openclaw/viral-tweets-monitor/commands.log"
PID_FILE="/home/agent/.openclaw/viral-tweets-monitor/listener.pid"

# Kill existing listener if running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping existing listener (PID $OLD_PID)..."
    kill "$OLD_PID"
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# Start the listener with auto-restart
echo "Starting Discord command listener..."
while true; do
  /usr/bin/node "$PROJECT_DIR/discord-commands.js" >> "$LOG_FILE" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Listener exited with code $EXIT_CODE. Restarting in 5s..." >> "$LOG_FILE"
  sleep 5
done &

# Save PID of the while loop
echo $! > "$PID_FILE"
echo "Listener started (PID $!). Logs: $LOG_FILE"
