# GOALS

*SSOT store — sole writer: requirements-gatherer. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**

## The real problem (the *why*)

The company is migrating a **legacy application** off an application server onto a **GKE cluster**, incrementally, using the **strangler fig pattern**. Spring Cloud Gateway is the edge component that lets them route *part* of the traffic to newly-migrated microservices and *part* to the still-running legacy system — so the two can coexist and the migration window (running in two environments) is kept as short as possible. **Hard deadline: the gateway must be production-ready in one month.** *(stated by client)*

## Objectives (outcomes — each traceable by a later quiz/exercise)

Upon completion, a participant can:

1. **G1 — Deploy the gateway.** Stand up a Spring Cloud Gateway instance and deploy it to a **GKE cluster**.
2. **G2 — Implement strangler-fig routing.** Configure **path-based** route splitting so that some paths reach new microservices and others reach the **legacy system** (`/legacy/**` → legacy, new paths → migrated services). *(routing rule: split by path — stated by client)*
3. **G3 — Validate incoming auth.** Validate incoming **JWT issued by Microsoft Entra ID** at the gateway (and apply **CORS**).
4. **G4 — Mint a downstream token.** At the gateway, **mint a custom internal token that emulates the token the legacy application already expects**, and propagate it to downstream services — so legacy/backend code does **not** have to be modified immediately for the migration.
5. **G5 — Distributed tracing.** Have the gateway **participate in or initiate OpenTelemetry tracing** (trace-context propagation across gateway → microservices → legacy).

## Technical facts pinned by the client

- **Identity provider (incoming):** Microsoft Entra ID. *(stated by client)*
- **Downstream token:** minted at the gateway, shaped to imitate the legacy app's existing token; purpose is to avoid immediate code changes and shorten dual-environment runtime. *(stated by client)*
- **Traffic split mechanism:** by **path**. *(stated by client)*
- **Ownership after the course:** Ops will help **configure** the gateway; developers own the Spring/gateway logic. *(stated by client — see personas)*
