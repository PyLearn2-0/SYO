"""
Tiny zero-dependency launcher for the SY0-701 quiz site.

Serves the contents of this directory on http://localhost:<port> and
opens it in the default browser. Uses only the Python standard library.

    python3 run.py            # default port 8000
    python3 run.py --port 9000
"""

from __future__ import annotations

import argparse
import http.server
import socketserver
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).parent


class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):  # disable browser caching during local dev
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter terminal output
        return


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Sec+ quiz on localhost.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), _Handler) as httpd:
        url = f"http://localhost:{args.port}/"
        print(f"Sec+ SY0-701 Quiz running at {url}")
        print("Press Ctrl+C to stop.")
        if not args.no_browser:
            threading.Timer(0.7, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
