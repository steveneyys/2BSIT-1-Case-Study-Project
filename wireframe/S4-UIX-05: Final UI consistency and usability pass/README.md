# S4-UIX-05 — Final UI Consistency and Usability Pass

**Owner:** Gala  
**Deliverable:** Static Figma review material  
**Status:** Not a signoff. Built-screen usability review and functional tests have not been performed.

## Scope

This review covers consistency across the Sprint 4 designs:

- S4-UIX-01 — Sales entry and line items
- S4-UIX-02 — Payment and balance screens
- S4-UIX-03 — Seven report screens and audit viewer
- S4-UIX-04 — Hi-fi mockups and developer handoff notes

The checklist and test scenarios below are review materials. They are not evidence that implementation or testing has been completed.

## Cross-Module Consistency Checklist

- [ ✓ ] Use the Hope, Inc. ERP name and shared typography: Host Grotesk for headings and Instrument Sans for interface text.
- [ ✓] Use the near-white and blue palette, 12px panel radius, fine borders, and 24px layout gaps.
- [✓ ] Keep low-fi and styled screens consistent in composition. Use full-size frames, local role variants, and companion implementation notes outside the product UI.
- [✓ ] Use only Superadmin, Admin, and User as underlying roles. Keep the five source demo identities unchanged. CEO is not a hierarchy role.
- [ ✓ ] Make workspace navigation and Quick Actions follow the same view/action access policy. Hide User Management from User. Disable denied contextual shortcuts and explain why.
- [ ✓] Filter business lists by role. In Admin views, show Active, Inactive, and All tabs; shade inactive rows and show the latest Stamp. Show Restore for inactive payments in the Admin view per Student Guide §2.3. User sees active rows and authorized actions only.
- [ ✓] Keep business Active/Inactive status separate from account Active/Pending/Blocked/Disapproved status. Do not make business Status or Stamp editable.
- [✓ ] Preserve relationships on soft delete and restore. Block deletes when active child records exist. Do not use permanent delete or invent cascade behavior.
- [✓ ] Reconcile sale-date prices, active-line totals, and the seven report outputs to the $884.50 source active sales. Label the sample payment balance of $84.50 separately.
- [ ✓] Redact salary and job-history data in lists, profiles, timelines, reports, Print/PDF output, and tooltips when the user lacks access.
- [ ✓] Keep the full audit viewer Superadmin-only. Separate proposed sample events from the latest Stamp. Do not invent payment, audit, or settings permissions.

## Open Scope Decisions and Reference Gaps

These items need confirmation before implementation. Do not create controls or policies that are not supported by the guide or approved requirements.

1. **System Settings:** Guide-only reference; HTML and task contents are absent. Scope is unresolved. Do not fabricate a module or controls.
2. **Payments:** Payment access policy, overpayment, negative values, duplicate ORNo, refunds, payment-date rules, inactive balance aggregation, and restore authorization remain unresolved. The Admin wireframe and hi-fi show Restore for an inactive payment to match Student Guide §2.3. Keep Record Payment disabled until access and financial rules are approved.
3. **Approval:** Sprint Plan says Superadmin-only, while supplied HTML includes Admin approval/status paths. Follow the Sprint Plan; confirmation remains open. Admin manages Users but cannot see Superadmins or manage Admins.
4. **Last active Superadmin:** Protection is required but absent from the HTML. Do not allow removal, disabling, or demotion of the last active Superadmin.
5. **Restoration:** Source lacks parent activity, child reactivation, and inactive duplicate-key conflict validation. Define the policy before implementation.
6. **Authentication:** HTML allows any password, auto-creates unknown users, and bypasses approval through Google sign-in. The first-login/token flow is missing. Salted password verification, throttling, and expiring single-use reset tokens are required; expiry and password policy remain open.
7. **Product current price and future-date reports:** Use the latest active price on or before today. Sales pricing uses the latest active price on or before the sale date. A missing price must not silently produce a zero-price sale. Sale-date editing and repricing policies remain open.
8. **Unauthorized source controls:** Source controls expose delete, price, and history actions. Intended rights must replace them. History effective-date uniqueness follows the stricter task plan, not the source composite-key allowance.
9. **Audit:** The planned full viewer is absent from the HTML. Filter/event details are proposed; retention, timezone, schema, and redaction remain open. Print/PDF is a static simulation, not an implemented export.
10. **Traceability:** S4-UIX-05; Sprint Task Plan pp. 1–6; Student Guide §§1.2, 2.3, 3, and 4.2; supplied HTML lines 590–1111 (forms), 1116–1171 (rights), 1193–1199 (identities), and data/behaviors through line 3806.

## Suggested End-to-End Test Register

**All scenarios are unchecked. No scenario below is claimed as executed.**

- [ ] Register → account is Pending and has no access.
- [ ] Superadmin approves → user sets a password on first login → user signs in.
- [ ] Assign all 36 action/report rights and configure the five separate module View controls. Verify Save persists, Cancel discards, module off/on, and All/None.
- [ ] User login → only authorized modules, actions, and active records appear. Direct API requests are also denied when unauthorized.
- [ ] Admin User Management → no Superadmin rows; Admin actions are unavailable; Admin manages Users only; last-Superadmin guard works.
- [ ] Customer/product setup → effective-date price → auto-numbered sale → permitted line-item entry → historical price → totals.
- [ ] Payment follows the approved policy → multiple receipts → sale/customer balance → error, refund, and inactive aggregation cases. Payment policy must be approved first.
- [ ] Reports → module and report rights → salary/history access gate → date/Top N filtering → Print/PDF.
- [ ] Soft delete with active children is blocked → eligible soft delete succeeds → restore preserves relationships.
- [ ] Full audit viewer is Superadmin-only; latest Stamp remains limited to the latest action.
- [ ] Backend enforces authorization on every request, row filtering, and salary redaction. Hiding a control in static Figma does not implement security.

## Static Figma Review — 29 Oct 2026

**Scope:** S4-UIX-01 sales/lines; S4-UIX-02 payment/balances; S4-UIX-03 seven reports and audit viewer; S4-UIX-04 matching hi-fi and handoff.

**Sources:** HOPE Sprint Task Plan, Student Guide §§3.6–3.7 and 4.2–4.3, and supplied HTML.

### Findings and Design Fixes

- **F01 — Visual inconsistency:** Fixed in design. Replaced the old olive palette/sidebar with shared Software tokens and a horizontal workspace shell across 60 existing screens. Centered forms and Cancel labels.
- **F02 — Top Products incomplete:** Fixed in design. Added quantity sold with unit (30 pcs / 100 meter / 5 can / 2 pcs) beside the amount. Report amount remains $884.50.
- **F03 — Navigation selection:** Fixed in design. Report outputs select Reports rather than Customers, Products, or Sales. User navigation remains role-scoped.
- **F04 — Recovery coverage:** Added dedicated empty, invalid-filter, save-error, and audit-no-results specimens. Handoff specifies draft/filter retention and export restrictions.
- **F05 — Payments/audit provenance:** Sample data and proposed access policy are identified. No permission keys were invented.
- **F06 — Inactive payment restore was missing:** Fixed in design. Added Restore to the inactive payment row in both wireframe and hi-fi Admin tables per Student Guide §2.3. Restore authorization and its effect on balances or inactive linked sales remain open for product owner, developer, and DBA review.

**Not executed:** Built-screen usability review, keyboard and responsive testing, API authorization, actual Print/PDF export, and end-to-end regression.

**Follow-up:** Tester Llabres and developer Alcantara should record build/version, role, task, expected versus actual result, severity, evidence link, owner, retest result, and date. Do not mark final signoff until results exist.

## Figma

Paste the link to the final S4-UIX-05 review frames here.
