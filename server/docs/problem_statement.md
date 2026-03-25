Track 3: Fintech

Context:
Small businesses often make financial decisions based only on their current bank
balance, without a clear view of upcoming obligations, payment timelines, and
trade-offs. As a result, they face avoidable cash shortfalls, delayed payments, and
reactive decision-making. Most existing tools focus on recording and reporting financial
data. They do not assist users in determining what action to take when available cash is
insufficient to meet all upcoming commitments.

Challenge:
Build an semi-autonomous system that models a user’s short-term financial state,
identifies situations where obligations exceed available liquidity, and determines the
most appropriate next action with clear and actionable reasoning.

Scope:
Participants are expected to design and implement a system with the following
capabilities:

● Multi-Source Financial State Modeling: Ingest fragmented financial inputs such
as bank statements , digital invoices, expenses and images(physical/handwritten)
receipts into a normalized structure that includes cash balance, payables, and
receivables.

● Constraint & Runway Detection: Quantify systemic risk identifying scenarios
where upcoming obligations cannot be fully satisfied with available cash.
Compute a time-based liquidity indicator such as days to zero, to provide a
real-time solvency countdown.

● Predictive Decision Engine: Model each obligation using attributes such as
urgency, risk/penalty, and flexibility. When conflicts arise, the engine must
perform deterministic scenario projections to prioritize obligations and justify
the chosen trade-offs.

● Context-Aware Action Preparation: Translate decisions into ready-to-use outputs
such as payment rescheduling plans or drafted negotiation emails. The strategic
approach and linguistic tone of these drafts must dynamically adapt based on the
specific counterparty relationship profile.

● Explainability & Chain-of-Thought: Provide clear, human-readable COT reasoning
at the decision level. Explanations should justify prioritization and trade-offs
without exposing unnecessary internal complexity.

Evaluation Criteria:

Criteria What we look for

Decision Integrity logical prioritization of obligations.

Strategic Reasoning Clarity of justifications for chosen trade-offs
and paths.

Data Robustness Extracting handwritten inputs, correlating
various data-sources, identifying duplicates,
etc. sky is your limit.

System Architecture Soundness of system design and separation
between decision logic and AI-assisted output
generation

Actionable Usability Ease of reviewing and triggering suggested
actions for non-technical users.

Reliability of techniques used Proven techniques, verifiable outputs, etc.

Constraints and Expectations:

● Participants are encouraged to use more deterministic systems for projections
and calculations, rather than relying solely on LLM-based reasoning.

● Enabling correct and actionable decisions is also appreciated, on top of providing
data visualizations and projections.

● The engine must ideally demonstrate high-fidelity processing of diverse data
formats, including digital transaction records and physical document images.

Innovate beyond these constraints to build a system that transforms financial anxiety into
clarity, turning fragmented obligations into decisive, confident action.