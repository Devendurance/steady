#!/usr/bin/env python3
"""Authenticated loopback client for the official Tari Ootle wallet daemon.

Reads and dry-runs by default. A real submission requires both --submit and the
STEADY_APPROVED_NETWORK environment variable matching the daemon's network.
"""
import argparse
import base64
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("command", choices=["status", "publish", "transaction", "receipt", "balance"])
p.add_argument("--file", help="WASM for publication, or wallet request JSON for a transaction")
p.add_argument("--tx", help="Transaction ID for a receipt")
p.add_argument("--account", help="Component address for a balance query")
p.add_argument("--max-fee", type=int, help="Publication fee ceiling in microTARI")
p.add_argument("--fee-account", default="steady-deploy")
p.add_argument("--url", default=os.environ.get("TARI_WALLETD_URL", "http://127.0.0.1:5100/json_rpc"))
p.add_argument("--cookie-file", default=os.environ.get("TARI_WALLET_COOKIE_FILE"))
p.add_argument("--submit", action="store_true", help="Actually submit and spend fees")
p.add_argument("--out", help="Save the public response to this path")
a = p.parse_args()

if not a.cookie_file:
    p.error("Set TARI_WALLET_COOKIE_FILE to the daemon's .cookie path")
cookie = pathlib.Path(a.cookie_file).read_text().strip()


def rpc(method, params):
    req = urllib.request.Request(
        a.url,
        data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + cookie},
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


try:
    info = rpc("wallet.get_info", {})
    if "error" in info:
        raise RuntimeError(info["error"]["message"])
    if a.submit and os.environ.get("STEADY_APPROVED_NETWORK") != info["result"]["network"]:
        p.error(
            "Submission blocked: set STEADY_APPROVED_NETWORK to the daemon network after review"
        )

    if a.command == "status":
        accounts = rpc("accounts.list", {"offset": 0, "limit": 20})
        result = {"wallet": info["result"], "accounts": accounts.get("result")}
    elif a.command == "balance":
        if not a.account:
            p.error("--account required")
        result = rpc("accounts.get_balances", {"account": a.account})
    elif a.command == "receipt":
        if not a.tx:
            p.error("--tx required")
        result = rpc("transactions.get_result", {"transaction_id": a.tx})
    elif a.command == "publish":
        if not a.file or not a.max_fee or a.max_fee <= 0:
            p.error("--file and a positive --max-fee are required")
        result = rpc(
            "transactions.publish_template",
            {
                "binary": base64.b64encode(pathlib.Path(a.file).read_bytes()).decode(),
                "fee_account": a.fee_account,
                "max_fee": a.max_fee,
                "detect_inputs": True,
                "dry_run": not a.submit,
            },
        )
    else:
        if not a.file:
            p.error("--file required")
        method = "transactions.submit" if a.submit else "transactions.submit_dry_run"
        result = rpc(method, json.loads(pathlib.Path(a.file).read_text()))

    if a.out:
        pathlib.Path(a.out).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if "error" in result:
        sys.exit(1)
except (OSError, ValueError, RuntimeError, urllib.error.URLError) as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
