//! Steady — private payroll with a public runway on Tari Ootle.
//!
//! An employer creates a payroll for a fixed monthly budget and a fixed number of months,
//! and funds it up front. The component holds the funds in a vault that the employer cannot
//! withdraw early: each month's slice is released only at or after its epoch, and only to the
//! employer, who then distributes it to the team as native Tari stealth transfers.
//!
//! The chain therefore learns the *aggregate*: how many people are on payroll, how much the
//! whole team costs per month, how many months are funded, and when each monthly run happened.
//! It never learns an individual salary, a name, or a recipient. The roster is committed as a
//! hash, so the employer can later prove the roster without publishing it.
//!
//! Authorization is explicit: the constructor records the transaction signer as the employer,
//! and `release_month` checks the signer against that key. The component is ownerless and
//! non-upgradable, and `fund` is open so anyone can top up a payroll.

use tari_template_lib::prelude::*;

#[template]
mod steady {
    use super::*;

    /// Longest label accepted, in bytes.
    const MAX_LABEL_BYTES: usize = 80;
    /// Longest roster commitment accepted, in bytes (a 64-char SHA-256 hex fits easily).
    const MAX_ROSTER_HASH_BYTES: usize = 128;
    /// Upper bounds keep component state small.
    const MAX_MONTHS: u64 = 120;
    const MAX_PAYEES: u64 = 500;

    pub struct Payroll {
        /// Public key of the employer who created the payroll. Only this key can release a month.
        employer: RistrettoPublicKeyBytes,
        /// TARI held for the whole committed payroll.
        vault: Vault,
        /// What the whole team costs per month, in micro-TARI. Public by design.
        monthly_budget: u64,
        /// How many monthly runs the payroll was created for.
        months: u64,
        /// How many people are on payroll. Public by design.
        payee_count: u64,
        /// First epoch at which month 1 can be released.
        start_epoch: u64,
        /// Epochs per month, supplied by the creator (Ootle epochs are block-height based).
        epochs_per_month: u64,
        /// How many monthly runs have been released so far.
        months_released: u64,
        /// SHA-256 (or similar) commitment to the off-chain roster. No names or salaries on chain.
        roster_hash: String,
        /// Human-readable label for the payroll.
        label: String,
    }

    impl Payroll {
        /// Creates a payroll. The transaction signer becomes the employer.
        ///
        /// `monthly_budget` is in micro-TARI. `months` is the number of monthly runs the
        /// payroll is committed to. `payee_count` is the headcount. `start_epoch` is the
        /// first epoch at which month 1 becomes releasable. `epochs_per_month` converts the
        /// epoch clock into months; the app supplies the current mainnet value.
        /// `roster_hash` commits to the off-chain roster without revealing it.
        pub fn new(
            monthly_budget: u64,
            months: u64,
            payee_count: u64,
            start_epoch: u64,
            epochs_per_month: u64,
            roster_hash: String,
            label: String,
        ) -> Component<Self> {
            let employer = CallerContext::transaction_signer_public_key();
            let now = Consensus::current_epoch();
            assert!(monthly_budget > 0, "Monthly budget must be greater than zero");
            assert!(months > 0 && months <= MAX_MONTHS, "Months must be between 1 and {MAX_MONTHS}");
            assert!(payee_count > 0 && payee_count <= MAX_PAYEES, "Payee count must be between 1 and {MAX_PAYEES}");
            assert!(epochs_per_month > 0, "Epochs per month must be greater than zero");
            assert!(start_epoch >= now, "Start epoch {start_epoch} is before the current epoch {now}");
            assert!(roster_hash.len() <= MAX_ROSTER_HASH_BYTES, "Roster hash is longer than {MAX_ROSTER_HASH_BYTES} bytes");
            assert!(label.len() <= MAX_LABEL_BYTES, "Label is longer than {MAX_LABEL_BYTES} bytes");

            Component::new(Self {
                employer,
                vault: Vault::new_empty(TARI_TOKEN),
                monthly_budget,
                months,
                payee_count,
                start_epoch,
                epochs_per_month,
                months_released: 0,
                roster_hash,
                label,
            })
            // Every state-changing method checks the signer itself; no owner can rewrite rules.
            .with_access_rules(AccessRules::allow_all())
            .with_owner_rule(OwnerRule::None)
            .create()
        }

        /// Adds TARI to the payroll. Open to anyone, but the total can never exceed the
        /// committed payroll (`monthly_budget * months`), so a payroll cannot be diluted
        /// with unrelated funds or overfunded by accident.
        pub fn fund(&mut self, bucket: Bucket) {
            assert_eq!(bucket.resource_address(), TARI_TOKEN, "Payroll is funded in TARI only");
            let amount = bucket.amount().to_u64_checked().expect("Funding amount is out of range");
            assert!(amount > 0, "Cannot fund an empty bucket");

            let balance = self.balance_u64();
            let cap = self
                .monthly_budget
                .checked_mul(self.months)
                .expect("Committed payroll is out of range");
            let new_balance = balance.checked_add(amount).expect("Payroll balance is out of range");
            assert!(new_balance <= cap, "Funding exceeds the committed payroll of {cap} µT");

            self.vault.deposit(bucket);
            emit_event("Funded", metadata![
                "employer" => self.employer.to_string(),
                "amount" => amount.to_string(),
                "balance" => new_balance.to_string(),
                "runway_months" => (new_balance / self.monthly_budget).to_string(),
            ]);
        }

        /// Releases exactly one month's aggregate budget to the employer, once that month's
        /// epoch has been reached. Only the employer key may call this. The released bucket
        /// is deposited into an account in the same transaction; the employer then pays the
        /// team with native Tari stealth transfers, so individual amounts never touch the chain.
        pub fn release_month(&mut self) -> Bucket {
            self.assert_employer();
            let month = self.months_released;
            assert!(month < self.months, "All months have already been released");

            let due = self.start_epoch + month * self.epochs_per_month;
            let now = Consensus::current_epoch();
            assert!(now >= due, "Month {} is not due until epoch {due} (now {now})", month + 1);
            assert!(
                self.balance_u64() >= self.monthly_budget,
                "Payroll is underfunded for this month"
            );

            self.months_released = month + 1;
            let amount = Amount::from_u64(self.monthly_budget);
            let bucket = self.vault.withdraw(amount);
            emit_event("PayrollRun", metadata![
                "employer" => self.employer.to_string(),
                "month" => (month + 1).to_string(),
                "amount" => self.monthly_budget.to_string(),
                "epoch" => now.to_string(),
                "balance_after" => self.balance_u64().to_string(),
                "runway_months_after" => (self.balance_u64() / self.monthly_budget).to_string(),
            ]);
            bucket
        }

        /// Public view used by the app and the proof page. Individual salaries and recipients
        /// are not part of this state and cannot be read from it.
        pub fn info(&self) -> PayrollInfo {
            let balance = self.balance_u64();
            let next_release_epoch = if self.months_released < self.months {
                self.start_epoch + self.months_released * self.epochs_per_month
            } else {
                0
            };
            PayrollInfo {
                employer: self.employer,
                label: self.label.clone(),
                roster_hash: self.roster_hash.clone(),
                monthly_budget: self.monthly_budget,
                months: self.months,
                months_released: self.months_released,
                payee_count: self.payee_count,
                start_epoch: self.start_epoch,
                epochs_per_month: self.epochs_per_month,
                balance,
                runway_months: balance / self.monthly_budget,
                next_release_epoch,
                current_epoch: Consensus::current_epoch(),
                fully_released: self.months_released >= self.months,
                underfunded: self.months_released < self.months && balance < self.monthly_budget,
            }
        }

        pub fn balance(&self) -> u64 {
            self.balance_u64()
        }

        pub fn monthly_budget(&self) -> u64 {
            self.monthly_budget
        }

        pub fn months_released(&self) -> u64 {
            self.months_released
        }

        pub fn runway_months(&self) -> u64 {
            self.balance_u64() / self.monthly_budget
        }

        pub fn next_release_epoch(&self) -> u64 {
            if self.months_released < self.months {
                self.start_epoch + self.months_released * self.epochs_per_month
            } else {
                0
            }
        }

        fn balance_u64(&self) -> u64 {
            self.vault.balance().to_u64_checked().expect("Payroll balance is out of range")
        }

        fn assert_employer(&self) {
            let signer = CallerContext::transaction_signer_public_key();
            assert!(signer == self.employer, "Only the employer can release payroll");
        }
    }

    /// What `info` returns. Declared after the component so the macro picks `Payroll`.
    pub struct PayrollInfo {
        pub employer: RistrettoPublicKeyBytes,
        pub label: String,
        pub roster_hash: String,
        pub monthly_budget: u64,
        pub months: u64,
        pub months_released: u64,
        pub payee_count: u64,
        pub start_epoch: u64,
        pub epochs_per_month: u64,
        pub balance: u64,
        pub runway_months: u64,
        pub next_release_epoch: u64,
        pub current_epoch: u64,
        pub fully_released: bool,
        pub underfunded: bool,
    }
}
