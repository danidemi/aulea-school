# STUDENT PERSONAS

*SSOT store — sole writer: requirements-gatherer. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**

The cohort of 4 splits along one dominant fault line: **2 Java developers** and **2 Ops**. Each persona below is a *map of competing priorities*, not demographics. Two personas are provided (both grounded in client-stated facts); a persona is mandatory and this satisfies it.

---

## Persona A — "Marco", the Java Developer (×2)

- **Problem-orientation trigger:** Owns the gateway's Spring code — routes, JWT validation, the custom downstream-token filter, tracing instrumentation. Wants working, idiomatic Spring Cloud Gateway patterns he can ship in a month. *(stated by client: devs comfortable with Spring, own gateway logic)*
- **Experience resource:** Comfortable with Spring Boot; knows REST and Docker. Strong asset — can move fast on filters/predicates. *(stated by client)*
- **Autonomy metric:** Fairly self-directed on Spring; wants depth (custom `GlobalFilter`/`GatewayFilter`, token minting, WebFlux/reactive gotchas) rather than hand-holding.
- **Situational reality:** Doing this against a live one-month migration deadline; will apply learning to the real repo immediately.
- **Tech/psychological gap:** Likely thinner on **GKE deployment specifics** and Entra ID token internals than on Spring itself. *(inferred — flag for human review)*
- **Margin (Power ÷ Load):** Deadline pressure is high; values reusable code/templates that reduce load.
- **Risk to manage:** Gets bored during pure infra segments.

## Persona B — "Sara", the Ops Engineer (×2)

- **Problem-orientation trigger:** Will **help configure and deploy** the gateway on GKE — cluster setup, manifests/config, routing config, CORS, wiring Entra ID and OpenTelemetry collectors. Does **not** write Java. *(stated by client)*
- **Experience resource:** Strong on Docker and infrastructure; comfortable with GKE/containers. Asset for G1 (deploy) and the operational side of G5 (tracing pipeline).
- **Autonomy metric:** Wants a clear, structured, config-first path; not asked to author Spring code.
- **Situational reality:** Same one-month deadline; will own the running gateway operationally after handover.
- **Tech/psychological gap:** **No Java/Spring** — most at risk during Spring-heavy, code-first segments. Needs concepts framed as *configuration and behavior* rather than source code. *(stated by client)*
- **Margin (Power ÷ Load):** Highest friction where the material assumes Java fluency.
- **Risk to manage:** Lost during Spring code deep-dives; must have a meaningful config/deploy/observability role in every hands-on segment.

---

## Cross-persona design directive

With only 8h in a mixed room, every hands-on block should offer **two lanes**: a *code lane* (devs: write the filter/route in Spring) and a *config-and-operate lane* (Ops: deploy it to GKE, wire config, verify traffic split and traces). Shared vocabulary first, then split by role, then reconverge. *(inferred design guidance — flag for human review)*
