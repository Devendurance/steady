#!/usr/bin/env python3
"""Run the Steady mainnet flow against the local Tari Ootle wallet daemon.

Steps: create the payroll component, fund 3 months, release month 1.
Every transaction is dry-run first, then submitted at a tight fee ceiling.
All requests and receipts are written to an evidence directory.
"""
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
WALLET_URL = os.environ.get("TARI_WALLETD_URL", "http://127.0.0.1:5100/json_rpc")
COOKIE_FILE = pathlib.Path(
    os.environ.get("TARI_WALLET_COOKIE_FILE", "/tmp/opencode/steady-wallet/mainnet/.cookie")
)
EVIDENCE = pathlib.Path(os.environ.get("STEADY_EVIDENCE", "/tmp/opencode/steady-evidence"))
FEE_ACCOUNT = "component_da95037acc1ea18aa722b935bbd8e371398918078f6c92c86833e98c7c8e2908"
TEMPLATE = "54d64fdd5af8a40fe9331611e1f37f473c1bf670f32523e2b093d704e76e3983"
SEAL_SIGNER = {"Derived": {"index": 0, "key_branch": "account"}}
NETWORK = "mainnet"

COOKIE = COOKIE_FILE.read_text().strip()
EVIDENCE.mkdir(parents=True, exist_ok=True)


def rpc(method, params, timeout=240):
    req = urllib.request.Request(
        WALLET_URL,
        data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + COOKIE},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def epoch():
    req = urllib.request.Request(
        "https://indexer-a.ootle.tari.com/epoch-manager/stats",
        headers={"User-Agent": "steady-flow/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["current_epoch"]


def write(name, data):
    path = EVIDENCE / name
    path.write_text(json.dumps(data, indent=2) + "\n")
    return path


def prepare(spec, name):
    spec["network"] = NETWORK
    spec["current_epoch"] = str(epoch())
    spec["fee_account"] = FEE_ACCOUNT
    spec["seal_signer"] = SEAL_SIGNER
    write(f"{name}-spec.json", spec)
    result = subprocess.run(
        [str(ROOT / "target/debug/examples/prepare"), str(EVIDENCE / f"{name}-spec.json")],
        capture_output=True,
        text=True,
        check=True,
    )
    request = json.loads(result.stdout)
    write(f"{name}-request.json", request)
    return request


def wait_result(tx, name):
    for _ in range(40):
        result = rpc("transactions.get_result", {"transaction_id": tx})
        if result.get("result") and result["result"].get("result"):
            write(f"{name}-receipt.json", result)
            return result
        time.sleep(3)
    raise RuntimeError(f"{name}: transaction {tx} did not finalize in time")


def submit_tight(spec, name):
    # Dry run with a generous ceiling, read the fee, then rebuild and submit tight.
    spec["max_fee"] = "1000000"
    request = prepare(spec, f"{name}-dry")
    dry = rpc("transactions.submit_dry_run", request)
    write(f"{name}-dry-run.json", dry)
    if dry.get("error"):
        raise RuntimeError(f"{name} dry run failed: {dry['error']}")
    fee = int(dry["result"]["required_fees"])
    spec["max_fee"] = str(fee + max(100, fee // 10))
    request = prepare(spec, name)
    env = dict(os.environ, STEADY_APPROVED_NETWORK=NETWORK)
    submitted = subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/wallet.py"),
            "transaction",
            "--file",
            str(EVIDENCE / f"{name}-request.json"),
            "--cookie-file",
            str(COOKIE_FILE),
            "--submit",
        ],
        capture_output=True,
        text=True,
        env=env,
    )
    if submitted.returncode != 0:
        raise RuntimeError(f"{name} submit failed: {submitted.stderr or submitted.stdout}")
    response = json.loads(submitted.stdout)
    write(f"{name}-submitted.json", response)
    tx = response["result"]["transaction_id"]
    receipt = wait_result(tx, name)
    return tx, receipt, dry


def created_component(receipt):
    for item in receipt["result"]["result"]["result"]["Accept"]["up_substates"]:
        if isinstance(item[0], str) and item[0].startswith("component_"):
            return item[0]
    for event in receipt["result"]["result"]["result"]["Accept"].get("events", []):
        if event.get("topic", "").endswith("component.created"):
            return event["substate_id"]
    raise RuntimeError("no component address in receipt")


def main():
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    state_path = EVIDENCE / "state.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}

    if step in ("create", "all"):
        spec = {
            "action": "create",
            "template": TEMPLATE,
            "monthly_budget": "500000",
            "months": "3",
            "payee_count": "5",
            "start_epoch": str(epoch()),
            "epochs_per_month": "2160",
            "roster_hash": state.get("roster_hash", ""),
            "label": "Northwind Studio",
        }
        if not spec["roster_hash"]:
            raise RuntimeError("state.json needs roster_hash")
        tx, receipt, dry = submit_tight(spec, "create")
        component = created_component(receipt)
        state.update({"component": component, "create_tx": tx, "create_fee": dry["result"]["required_fees"]})
        state_path.write_text(json.dumps(state, indent=2) + "\n")
        print(f"create: {tx} component={component}")

    if step in ("fund", "all"):
        tx, receipt, dry = submit_tight(
            {"action": "fund", "rail": state["component"], "amount_micro": "1500000"}, "fund"
        )
        state.update({"fund_tx": tx, "fund_fee": dry["result"]["required_fees"]})
        state_path.write_text(json.dumps(state, indent=2) + "\n")
        print(f"fund: {tx}")

    if step in ("release", "all"):
        tx, receipt, dry = submit_tight(
            {"action": "release", "rail": state["component"]}, "release"
        )
        state.update({"release_tx": tx, "release_fee": dry["result"]["required_fees"]})
        state_path.write_text(json.dumps(state, indent=2) + "\n")
        print(f"release: {tx}")

    print(json.dumps(state, indent=2))


if __name__ == "__main__":
    main()
