# Spec: Enrolling in a class

> feature: inscricao-turma
> status: implemented

## Context

An interested visitor enrolls in an open class of the course. The system
respects the seat limit and, when the student is a minor, requires guardian
consent (LGPD art. 14).

## Stories

### US-001 — Student enrolls in an open class

As an interested visitor, I want to enroll in a class with seats available, so that I
can secure my spot in the course.

#### AC-001 — Enrollment in a class with a free seat

- **Given** an open class with seats available
- **When** the visitor submits a valid name, email and phone
- **Then** the enrollment is recorded and the number of available seats is decremented

#### AC-002 — Full class refuses enrollment

- **Given** a class with no seats left
- **When** the visitor tries to enroll
- **Then** the enrollment is refused with the message "class is full"

### US-002 — Minor requires consent

As a guardian, I want to authorize the enrollment of a minor, so that the registration
has a legal basis.

#### AC-003 — Enrollment of a minor without consent is blocked

- **Given** a visitor who reports an age under 18
- **When** they try to complete the enrollment without guardian data
- **Then** the enrollment is blocked asking for the guardian's consent

## Out of scope

- Billing and payment (separate feature).
- Enrollment cancellation by the student.

## Assumptions

| ID | Assumption | Status | Resolution |
|---|---|---|---|
| ASM-001 | Email is the student's unique identifier | confirmed | decided with the product on 17/07 |
| ASM-002 | Age is self-declared in the form | confirmed | MVP does not validate documents |

## Open Questions

| ID | Question | Status | Answer |
|---|---|---|---|
| Q-001 | Do we store the guardian's email separately from the student's email? | answered | yes, its own field |
