#!/usr/bin/env python3
"""Tiny disposable upstream used only by runtime-check.sh.

It deliberately fails the analytics endpoint while leaving unrelated paths
healthy. It is never deployed and does not accept or persist request data.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import os


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path.startswith("/count"):
            self.send_response(503)
            body = b"analytics dependency deliberately unavailable\n"
        else:
            self.send_response(200)
            body = b"upstream fixture\n"
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        return


HTTPServer(("0.0.0.0", int(os.environ.get("PORT", "80"))), Handler).serve_forever()
