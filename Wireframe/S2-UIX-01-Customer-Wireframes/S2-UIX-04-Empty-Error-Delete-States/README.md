# S2-UIX-04 — Empty, Error, and Confirm-Delete States

Assigned to: Dan Jewel Gala
Status: Prepared — for team review

## Figma
[View state designs](https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11774)

## Included states
- Empty customer list
- No customer search results
- Customer loading failure
- Empty product list
- Empty price history
- Customer, product, and price validation errors
- Customer update failure
- Access denied
- Customer, product, and price delete confirmations
- Customer and product deletion blocked by active children
- Customer restored

## Intended behavior
- Empty states explain what the user can do next.
- Validation errors identify the affected fields.
- Save failures preserve entered values.
- Delete confirmations identify the affected record.
- Cancel leaves the record unchanged.
- Approved deletion is soft deletion.
- Active child records block parent deletion.
- Restore retains the original record and relationships.

## Visual consistency
Screens use the shared blue-and-white design,
typography, navigation, and panel styles.

## Validation
These are designed UI states.
Actual error handling and deletion behavior require testing.
