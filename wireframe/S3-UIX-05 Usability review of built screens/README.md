# S3-UIX-05 — Usability Review Plan and Fix Register

## Purpose

Plan a review of the built HR screens and record usability issues, fixes, and retest results.

## Current status

**Usability testing has not yet been completed.** This document is a review plan. Add findings only after testing the built website.

## Review checklist

### Roles and permissions

- [ ] A User has no HR access unless HR rights are granted.
- [ ] Users see only active records and permitted actions.
- [ ] Users do not see the Status or Stamp columns.
- [ ] Salary and job history are hidden from users without the required permission, including in profiles, reports, and exports.

### Data and tasks

- [ ] Add and edit Job, Department, and Employee records.
- [ ] Find an employee and distinguish current assignments from past assignments.
- [ ] Confirm whether employee codes can be changed after creation.
- [ ] Leave the Separation Date blank when allowed.
- [ ] Reject a Separation Date earlier than the Hire Date.
- [ ] Check duplicate employee and effective date validation.
- [ ] Check negative salary validation where applicable.
- [ ] Confirm entered values remain after validation or save errors.
- [ ] Confirm that the current assignment follows the approved system rules.

### Data safety and accessibility

- [ ] Active dependent history blocks deletion of its Employee, Job, or Department.
- [ ] A blocked deletion does not change the record.
- [ ] Soft delete and restore preserve record relationships.
- [ ] Core tasks can be completed using a keyboard.
- [ ] Focus, field labels, and error messages are clear.
- [ ] Screens work at narrow viewport sizes.
- [ ] Empty, restricted, loading, and failure states are easy to distinguish.

## Test details to record

For each test, record:

- Reviewer or participant
- Build URL and commit
- Device, browser, and viewport
- Task and expected result
- Observed result and evidence
- Severity and assigned owner
- Fix reference and retest result

## Fix register

Add an issue only after observing it during an actual review. Do not invent issue IDs or mark issues as fixed before retesting.

| ID | Screen or state | Observed issue | Severity | Fix | Owner | Retest result | Evidence |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## Export

Suggested filename: `S3-UIX-05-Usability-Review-Plan.pdf`

Keep the checklist and fix register blank until testing takes place. Then add the actual test date, build, context, evidence, findings, fixes, and retest results.

## Figma

S3-UIX-05 — Usability Review Plan:  
https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-15861
