//! Engine tests for the Steady payroll contract, run in-process on the real Ootle engine.
//!
//! Covered:
//!  * an employer creates a payroll, funds it, and releases month 1 only at its epoch;
//!  * a stranger, and the employee side, cannot release payroll;
//!  * funding is capped at the committed payroll and cannot be diluted;
//!  * every month is released exactly once, and the aggregate balance falls by exactly
//!    the monthly budget;
//!  * `info` exposes aggregates only: no individual salary or recipient exists on chain;
//!  * bad constructor inputs are rejected.

use ootle_byte_type::ToByteType;
use tari_crypto::ristretto::{RistrettoPublicKey, RistrettoSecretKey};
use tari_engine_types::virtual_substate::{VirtualSubstate, VirtualSubstateId};
use tari_ootle_transaction::args;
use tari_template_lib::types::{
    Amount, ComponentAddress, NonFungibleAddress, constants::TARI_TOKEN, crypto::RistrettoPublicKeyBytes,
};
use tari_template_test_tooling::TemplateTest;

const MONTHLY: u64 = 1_000_000;
const MONTHS: u64 = 3;
const PAYEES: u64 = 5;
const START: u64 = 10;
const EPOCHS_PER_MONTH: u64 = 10;
const ROSTER: &str = "9f2c6c1d4b7f3a8e5d0c2b1a4f6e8d7c3b5a9f1e2d4c6b8a0f3e5d7c9b1a2f4e";
const LABEL: &str = "Northwind Studio";

struct Party {
    account: ComponentAddress,
    proof: NonFungibleAddress,
    secret: RistrettoSecretKey,
    public_key: RistrettoPublicKey,
}

impl Party {
    fn create(test: &mut TemplateTest) -> Self {
        let (account, proof, secret, public_key) = test.create_funded_account_with_keypair();
        Self { account, proof, secret, public_key }
    }

    fn pk_bytes(&self) -> RistrettoPublicKeyBytes {
        self.public_key.to_byte_type()
    }
}

struct Setup {
    test: TemplateTest,
    payroll: ComponentAddress,
    employer: Party,
    employee: Party,
    stranger: Party,
}

fn make_setup() -> Setup {
    let mut test = TemplateTest::my_crate();
    let employer = Party::create(&mut test);
    let employee = Party::create(&mut test);
    let stranger = Party::create(&mut test);

    let template = test.get_template_address("Payroll");
    test.execute_expect_success(
        test.transaction()
            .call_function(
                template,
                "new",
                args![MONTHLY, MONTHS, PAYEES, START, EPOCHS_PER_MONTH, ROSTER.to_string(), LABEL.to_string()],
            )
            .build_and_seal(&employer.secret),
        vec![],
    );
    let payroll: ComponentAddress = test.expect_return(0);

    Setup { test, payroll, employer, employee, stranger }
}

fn balance(test: &mut TemplateTest, party: &Party) -> u64 {
    let amount: Amount =
        test.call_method(party.account, "balance", args![TARI_TOKEN], vec![party.proof.clone()]);
    amount.to_u64_checked().expect("account balance out of range")
}

fn payroll_balance(test: &mut TemplateTest, payroll: ComponentAddress) -> u64 {
    test.call_method(payroll, "balance", args![], vec![])
}

fn set_epoch(test: &mut TemplateTest, epoch: u64) {
    test.set_virtual_substate(VirtualSubstateId::CurrentEpoch, VirtualSubstate::CurrentEpoch(epoch));
}

fn fund(setup: &mut Setup, amount: u64) {
    let payroll = setup.payroll;
    let account = setup.employer.account;
    let secret = setup.employer.secret.clone();
    let proof = setup.employer.proof.clone();
    setup.test.execute_expect_success(
        setup
            .test
            .transaction()
            .call_method(account, "withdraw", args![TARI_TOKEN, amount])
            .put_last_instruction_output_on_workspace("funding")
            .call_method(payroll, "fund", args![Workspace("funding")])
            .build_and_seal(&secret),
        vec![proof],
    );
}

fn fund_expect_failure(setup: &mut Setup, amount: u64) {
    let payroll = setup.payroll;
    let account = setup.employer.account;
    let secret = setup.employer.secret.clone();
    let proof = setup.employer.proof.clone();
    setup.test.execute_expect_failure(
        setup
            .test
            .transaction()
            .call_method(account, "withdraw", args![TARI_TOKEN, amount])
            .put_last_instruction_output_on_workspace("funding")
            .call_method(payroll, "fund", args![Workspace("funding")])
            .build_and_seal(&secret),
        vec![proof],
    );
}

fn release(setup: &mut Setup, signer: &RistrettoSecretKey) {
    let payroll = setup.payroll;
    let account = setup.employer.account;
    setup.test.execute_expect_success(
        setup
            .test
            .transaction()
            .call_method(payroll, "release_month", args![])
            .put_last_instruction_output_on_workspace("payroll")
            .call_method(account, "deposit", args![Workspace("payroll")])
            .build_and_seal(signer),
        vec![],
    );
}

fn release_expect_failure(setup: &mut Setup, signer: &RistrettoSecretKey) {
    let payroll = setup.payroll;
    let account = setup.employer.account;
    setup.test.execute_expect_failure(
        setup
            .test
            .transaction()
            .call_method(payroll, "release_month", args![])
            .put_last_instruction_output_on_workspace("payroll")
            .call_method(account, "deposit", args![Workspace("payroll")])
            .build_and_seal(signer),
        vec![],
    );
}

#[test]
fn employer_funds_and_releases_a_month_only_when_due() {
    let mut setup = make_setup();
    let employer_secret = setup.employer.secret.clone();
    let employer_before = balance(&mut setup.test, &setup.employer);

    fund(&mut setup, MONTHLY * MONTHS);
    assert_eq!(payroll_balance(&mut setup.test, setup.payroll), MONTHLY * MONTHS);
    assert_eq!(balance(&mut setup.test, &setup.employer), employer_before - MONTHLY * MONTHS);

    // One epoch early: refused.
    set_epoch(&mut setup.test, START - 1);
    release_expect_failure(&mut setup, &employer_secret);

    // At the start epoch: month 1 releases exactly the monthly budget.
    set_epoch(&mut setup.test, START);
    release(&mut setup, &employer_secret);
    assert_eq!(payroll_balance(&mut setup.test, setup.payroll), MONTHLY * (MONTHS - 1));
    assert_eq!(balance(&mut setup.test, &setup.employer), employer_before - MONTHLY * (MONTHS - 1));
    let released: u64 = setup.test.call_method(setup.payroll, "months_released", args![], vec![]);
    assert_eq!(released, 1);
    let runway: u64 = setup.test.call_method(setup.payroll, "runway_months", args![], vec![]);
    assert_eq!(runway, MONTHS - 1);
}

#[test]
fn only_the_employer_can_release_payroll() {
    let mut setup = make_setup();
    let employee_secret = setup.employee.secret.clone();
    let stranger_secret = setup.stranger.secret.clone();
    fund(&mut setup, MONTHLY * MONTHS);
    set_epoch(&mut setup.test, START);

    // Neither an employee nor a stranger can pull the monthly budget.
    release_expect_failure(&mut setup, &employee_secret);
    release_expect_failure(&mut setup, &stranger_secret);

    // The employer still can.
    let employer_secret = setup.employer.secret.clone();
    release(&mut setup, &employer_secret);
}

#[test]
fn funding_is_capped_at_the_committed_payroll() {
    let mut setup = make_setup();
    fund(&mut setup, MONTHLY * MONTHS);
    // One micro-TARI more would exceed the commitment and is refused.
    fund_expect_failure(&mut setup, 1);
    assert_eq!(payroll_balance(&mut setup.test, setup.payroll), MONTHLY * MONTHS);

    // A partially funded payroll still works: fund the rest in a second transaction.
    let mut setup = make_setup();
    fund(&mut setup, MONTHLY);
    assert_eq!(payroll_balance(&mut setup.test, setup.payroll), MONTHLY);
    fund(&mut setup, MONTHLY * (MONTHS - 1));
    assert_eq!(payroll_balance(&mut setup.test, setup.payroll), MONTHLY * MONTHS);
}

#[test]
fn each_month_releases_once_and_a_fourth_release_fails() {
    let mut setup = make_setup();
    let employer_secret = setup.employer.secret.clone();
    fund(&mut setup, MONTHLY * MONTHS);

    for month in 0..MONTHS {
        set_epoch(&mut setup.test, START + month * EPOCHS_PER_MONTH);
        release(&mut setup, &employer_secret);
        assert_eq!(payroll_balance(&mut setup.test, setup.payroll), MONTHLY * (MONTHS - month - 1));
    }

    // A fourth release is refused, and the payroll is empty.
    set_epoch(&mut setup.test, START + MONTHS * EPOCHS_PER_MONTH);
    release_expect_failure(&mut setup, &employer_secret);
    assert_eq!(payroll_balance(&mut setup.test, setup.payroll), 0);
}

#[test]
fn underfunded_payroll_cannot_release() {
    let mut setup = make_setup();
    let employer_secret = setup.employer.secret.clone();
    set_epoch(&mut setup.test, START);
    // Nothing was funded.
    release_expect_failure(&mut setup, &employer_secret);

    // Fund less than one month: still refused.
    fund(&mut setup, MONTHLY - 1);
    release_expect_failure(&mut setup, &employer_secret);

    // Top up to exactly one month: it releases.
    fund(&mut setup, 1);
    release(&mut setup, &employer_secret);
    assert_eq!(payroll_balance(&mut setup.test, setup.payroll), 0);
}

#[test]
fn info_exposes_only_public_aggregates() {
    let mut setup = make_setup();
    fund(&mut setup, MONTHLY * MONTHS);
    set_epoch(&mut setup.test, START + EPOCHS_PER_MONTH);
    let employer_secret = setup.employer.secret.clone();
    release(&mut setup, &employer_secret);

    // CBOR encodes the struct positionally, in field order.
    let info: (
        RistrettoPublicKeyBytes,
        String,
        String,
        u64,
        u64,
        u64,
        u64,
        u64,
        u64,
        u64,
        u64,
        u64,
        u64,
        bool,
        bool,
    ) = setup.test.call_method(setup.payroll, "info", args![], vec![]);

    assert_eq!(info.0, setup.employer.pk_bytes());
    assert_eq!(info.1, LABEL);
    assert_eq!(info.2, ROSTER);
    assert_eq!(info.3, MONTHLY);
    assert_eq!(info.4, MONTHS);
    assert_eq!(info.5, 1);
    assert_eq!(info.6, PAYEES);
    assert_eq!(info.7, START);
    assert_eq!(info.8, EPOCHS_PER_MONTH);
    assert_eq!(info.9, MONTHLY * (MONTHS - 1));
    assert_eq!(info.10, MONTHS - 1);
    assert_eq!(info.11, START + EPOCHS_PER_MONTH);
    assert!(!info.13); // fully_released
    assert!(!info.14); // underfunded
}

#[test]
fn constructor_rejects_bad_inputs() {
    let mut test = TemplateTest::my_crate();
    set_epoch(&mut test, 10);
    let employer = Party::create(&mut test);
    let template = test.get_template_address("Payroll");
    let cases: Vec<(u64, u64, u64, u64, u64, String, String, &str)> = vec![
        (0, MONTHS, PAYEES, START, EPOCHS_PER_MONTH, ROSTER.into(), LABEL.into(), "Monthly budget"),
        (MONTHLY, 0, PAYEES, START, EPOCHS_PER_MONTH, ROSTER.into(), LABEL.into(), "Months"),
        (MONTHLY, 121, PAYEES, START, EPOCHS_PER_MONTH, ROSTER.into(), LABEL.into(), "Months"),
        (MONTHLY, MONTHS, 0, START, EPOCHS_PER_MONTH, ROSTER.into(), LABEL.into(), "Payee count"),
        (MONTHLY, MONTHS, 501, START, EPOCHS_PER_MONTH, ROSTER.into(), LABEL.into(), "Payee count"),
        (MONTHLY, MONTHS, PAYEES, START, 0, ROSTER.into(), LABEL.into(), "Epochs per month"),
        (MONTHLY, MONTHS, PAYEES, 9, EPOCHS_PER_MONTH, ROSTER.into(), LABEL.into(), "before the current epoch"),
        (MONTHLY, MONTHS, PAYEES, START, EPOCHS_PER_MONTH, "x".repeat(129), LABEL.into(), "Roster hash"),
        (MONTHLY, MONTHS, PAYEES, START, EPOCHS_PER_MONTH, ROSTER.into(), "x".repeat(81), "Label"),
    ];

    for (monthly, months, payees, start, epochs, roster, label, expected) in cases {
        let reason = test.execute_expect_failure(
            test.transaction()
                .call_function(template, "new", args![monthly, months, payees, start, epochs, roster, label])
                .build_and_seal(&employer.secret),
            vec![],
        );
        let text = format!("{reason:?}");
        assert!(text.contains(expected), "expected rejection containing {expected:?}, got {text}");
    }
}
