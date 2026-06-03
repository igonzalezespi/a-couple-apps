# Architecture Decision Records

This directory holds the architecturally significant decisions for A Couple Apps, in
[MADR](https://adr.github.io/madr/) 4.x format. Each ADR is immutable once accepted: to
revisit a decision, add a new ADR that supersedes it rather than rewriting history.

## Records

| ADR                                            | Status   | Title           |
| ---------------------------------------------- | -------- | --------------- |
| [0001](./0001-foundation-stack.md)             | accepted | Foundation Stack |

## Adding an ADR

1. Copy [`adr-template.md`](./adr-template.md) to `NNNN-kebab-title.md`, using the next
   sequential number.
2. Fill in the frontmatter (`status`, `date`, `decision-makers`) and the body; remove the
   guidance blockquotes.
3. Add a row to the table above.

New here? Start with the [template](./adr-template.md) — it documents the expected
sections and frontmatter.
