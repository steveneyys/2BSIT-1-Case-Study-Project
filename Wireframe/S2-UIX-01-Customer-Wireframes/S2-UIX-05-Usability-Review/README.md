# S2-UIX-05 — Usability Review and Fix List

Assigned to: Dan Jewel Gala
Status: Review prepared — testing pending

## Figma
[View usability checklist](https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11957)

## Review scope
- Customer lists and forms
- Product lists and forms
- Price History and price forms
- Role-based visibility and actions
- Validation and error recovery
- Soft delete and restore
- Keyboard navigation

## Testing checklist
- [ ] Search and filters return the expected records.
- [ ] Users see active records and authorized actions only.
- [ ] Required fields and duplicate identifiers are validated.
- [ ] Existing identifiers cannot be edited.
- [ ] Negative prices are rejected.
- [ ] Price history displays newest records first.
- [ ] Current price respects the selected effective date.
- [ ] Customers with active sales cannot be deleted.
- [ ] Products with active dependent records cannot be deleted.
- [ ] Restore preserves record relationships.
- [ ] Save failures preserve entered values.
- [ ] Keyboard navigation and focus are clear.

## Initial design fix list
| Finding | Required action | Status |
|---|---|---|
| Customer search hint differs from the documented scope. | Align the hint and search specification. | Open |

## Built-screen review results
Not yet performed.

Record the following when testing:
- Review date and reviewer
- Website URL and version or commit
- Task performed
- Expected and actual result
- Screenshot or evidence
- Issue priority and assigned owner
- Fix and retest outcome

Do not mark this review complete until actual results
and follow-up outcomes are recorded.
