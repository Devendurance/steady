//! Build a Tari Ootle walletd submission request for Steady.
//!
//! Reads a JSON spec, uses the official transaction builder, and prints the
//! unsigned V2 envelope that `transactions.submit` / `transactions.submit_dry_run`
//! expects. It never connects to a wallet, signs, or spends.
//!
//! Actions:
//!   create  - call the published Payroll template's `new`
//!   fund    - withdraw TARI from the fee account and deposit it into a payroll
//!   release - call `release_month` and deposit the released bucket back
//!   transfer- move revealed TARI from the fee account to another account
//!
//! Usage: cargo run --example prepare -- spec.json

use serde_json::Value;
use std::{
    env, fs,
    str::FromStr,
    time::{SystemTime, UNIX_EPOCH},
};
use tari_template_lib::prelude::*;
use tari_template_test_tooling::transaction::{Epoch, Network, Transaction, args};

fn text<'a>(v: &'a Value, k: &str) -> Result<&'a str, String> {
    v[k].as_str().ok_or_else(|| format!("Missing string {k}"))
}

fn number(v: &Value, k: &str) -> Result<u64, Box<dyn std::error::Error>> {
    if let Some(n) = v[k].as_u64() {
        return Ok(n);
    }
    Ok(text(v, k)?.parse()?)
}

fn component(v: &Value, k: &str) -> Result<ComponentAddress, Box<dyn std::error::Error>> {
    Ok(ComponentAddress::from_str(text(v, k)?)?)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = env::args().nth(1).ok_or("Usage: prepare REQUEST_SPEC.json")?;
    let spec: Value = serde_json::from_str(&fs::read_to_string(path)?)?;

    let network = match text(&spec, "network")? {
        "mainnet" => Network::MainNet,
        "esmeralda" => Network::Esmeralda,
        "localnet" => Network::LocalNet,
        _ => return Err("Unknown network".into()),
    };
    let max_fee = number(&spec, "max_fee")?;
    if max_fee == 0 {
        return Err("max_fee must be positive".into());
    }

    let nonce = u64::try_from(SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos())?;
    let mut tx = Transaction::builder(
        network,
        Epoch(
            number(&spec, "current_epoch")?
                .checked_add(3)
                .ok_or("Epoch overflow")?,
        ),
    )
    .with_nonce(nonce)
    .pay_fee_from_component(component(&spec, "fee_account")?, max_fee);

    match text(&spec, "action")? {
        "create" => {
            let template = TemplateAddress::from_str(text(&spec, "template")?)?;
            tx = tx.call_function(
                template,
                "new",
                args![
                    number(&spec, "monthly_budget")?,
                    number(&spec, "months")?,
                    number(&spec, "payee_count")?,
                    number(&spec, "start_epoch")?,
                    number(&spec, "epochs_per_month")?,
                    text(&spec, "roster_hash")?.to_string(),
                    text(&spec, "label")?.to_string()
                ],
            );
        }
        "fund" => {
            let amount = number(&spec, "amount_micro")?;
            tx = tx
                .call_method(
                    component(&spec, "fee_account")?,
                    "withdraw",
                    args![TARI_TOKEN, Amount::from(amount)],
                )
                .put_last_instruction_output_on_workspace("funds")
                .call_method(component(&spec, "rail")?, "fund", args![Workspace("funds")]);
        }
        "release" => {
            tx = tx
                .call_method(component(&spec, "rail")?, "release_month", args![])
                .put_last_instruction_output_on_workspace("payroll")
                .call_method(
                    component(&spec, "fee_account")?,
                    "deposit",
                    args![Workspace("payroll")],
                );
        }
        "transfer" => {
            let amount = number(&spec, "amount_micro")?;
            tx = tx
                .call_method(
                    component(&spec, "fee_account")?,
                    "withdraw",
                    args![TARI_TOKEN, Amount::from(amount)],
                )
                .put_last_instruction_output_on_workspace("transfer")
                .call_method(
                    component(&spec, "recipient")?,
                    "deposit",
                    args![Workspace("transfer")],
                );
        }
        _ => return Err("action must be create, fund, release or transfer".into()),
    }

    // walletd 0.54 expects the V1 unsigned envelope. (0.55 introduced the V2 envelope.)
    let unsigned = serde_json::to_value(tx.build_unsigned())?;

    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!({
            "transaction": unsigned,
            "seal_signer": spec["seal_signer"],
            "other_signers": spec.get("other_signers").cloned().unwrap_or(serde_json::json!([])),
            "signatures": [],
            "detect_inputs": true,
            "detect_inputs_use_unversioned": true,
            "lock_ids": [],
        }))?
    );
    Ok(())
}
