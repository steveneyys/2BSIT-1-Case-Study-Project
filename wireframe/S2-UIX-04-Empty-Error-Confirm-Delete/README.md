# S2-UIX-04 — Empty, Error and Confirm-Delete States

**Assigned to:** Dan Jewel Gala  
**Role:** UI/UX Designer  
**Sprint:** 2

## Overview

This task covers interface feedback for Customer Management,
Product Management, and Price History.

The designs help users understand empty lists, invalid input,
failed requests, restricted actions, and record deletion.

## Figma Design

[View S2-UIX-04](https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11774)

## Included States

### Empty States
- No customer records.
- No product records.
- No active price history.
- No matching customer search results.

### Error States
- Customer form validation errors.
- Duplicate Product Code and missing product fields.
- Invalid date or negative Unit Price.
- Duplicate price effective date.
- Customer loading failure with Retry.
- Customer save failure with retained input.
- Access denied for an unauthorized customer-delete action.

### Delete and Restore States
- Customer soft-delete confirmation.
- Product soft-delete confirmation.
- Price-entry soft-delete confirmation.
- Customer deletion blocked by active related sales.
- Product deletion blocked by active related records.
- Customer restore success for an administrative account.

## Design Corrections

- Matched empty-state messages with record counts.
- Displayed no current price when no applicable price exists.
- Matched validation messages with the entered sample values.
- Added record details to delete confirmations.
- Clarified the customer-delete permission message.
- Moved scenario explanations into companion notes.

## Files

- README.md — task overview and Figma reference.
- handoff-notes.md — expected behavior and implementation notes.
- screenshots/ — exported design frames.

## References

- Hope, Inc. ERP Student Guide.
- HOPE Sprint Task Plan.
- Original Hope, Inc. ERP HTML prototype.

## Validation Scope

The design content and updated layouts were visually reviewed.

These deliverables are UI designs and developer handoff references.
Prototype interactions, database changes, and backend permission
checks require separate implementation and testing.
