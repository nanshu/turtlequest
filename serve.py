#!/usr/bin/env python3
"""Local static server for TurtleQuest with COOP/COEP headers for SharedArrayBuffer."""

import http.server
import os
import socketserver
import sys
from typing import Optional


class CrossOriginRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler enabling Cross-Origin Isolation for Pyodide Worker interrupts & input()."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".py": "text/plain; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
    }

    def end_headers(self) -> None:
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


class ReusableThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main(port_arg: Optional[str] = None) -> None:
    port = int(port_arg) if port_arg else 8000
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)

    with ReusableThreadingServer(("127.0.0.1", port), CrossOriginRequestHandler) as httpd:
        url = f"http://127.0.0.1:{port}"
        print(f"TurtleQuest server running at {url}")
        print("Cross-Origin Isolation enabled (instant Stop & live input() active).")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down TurtleQuest server.")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
