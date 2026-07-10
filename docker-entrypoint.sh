#!/bin/sh
set -eu

display_number=99
Xvfb ":${display_number}" -screen 0 1920x1080x24 -nolisten tcp -ac >/tmp/xvfb.log 2>&1 &
xvfb_pid=$!

attempt=0
while [ ! -S "/tmp/.X11-unix/X${display_number}" ]; do
	attempt=$((attempt + 1))
	if [ "$attempt" -ge 50 ]; then
		kill "$xvfb_pid" 2>/dev/null || true
		cat /tmp/xvfb.log >&2
		exit 1
	fi
	sleep 0.1
done

export DISPLAY=":${display_number}"
exec bun dist/index.js
