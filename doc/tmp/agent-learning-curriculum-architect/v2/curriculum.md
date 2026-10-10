# CURRICULUM

*SSOT store — sole writer: learning-curriculum-architect. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**

Source stores read for this draft (retrieval before generation): `specifications/goals.md`,
`specifications/student_personas.md`, `specifications/logistics.md` — all three complete, all entries
`[stated]` except where noted below.

Written in English to stay consistent with the sibling SSOT stores (also English); learner-facing
framing text renders in **Italian** at materials-authoring time, per LOGISTICS.

This is a **first draft** — no prior version of this store exists.

---

## Legend

`provenance_tags` enum: `[stated]`, `[inferred]`, `[inherited_inferred]`, `[invented_framing]`, `[risk]`.
`knowledge_type` enum: `declarative`, `procedural`, `contextual`.

---

## 1. Baseline nodes (per persona — read from STUDENT_PERSONAS/LOGISTICS)

| id | key | description | held by | knowledge_type | provenance |
|---|---|---|---|---|---|
| BSL-01 | rest-api | REST as a client/server interaction model | all 4 | declarative | [stated] |
| BSL-02 | docker-containers | Building/running containers with Docker | all 4 | procedural | [stated] |
| BSL-03 | spring-boot | Comfortable building/running Spring Boot apps | 2 devs (Marco×2) | procedural | [stated] |
| BSL-04 | gke-containers-ops | Comfortable with GKE/containers, infra operations | 2 Ops (Sara×2) | procedural | [stated] |

Persona-shaped gaps that the graph must route around rather than assume away:

- Devs are **thin on GKE deployment specifics and Entra ID token internals** relative to Spring — `[inherited_inferred]` (already flagged "inferred" in STUDENT_PERSONAS itself).
- Ops have **no Java/Spring** and must never be required to write gateway code — `[stated]`.
- Design directive: every hands-on block needs a **code lane** (devs) and a **config-and-operate lane** (Ops), shared vocabulary first, split by role, then reconverge — `[inherited_inferred]` (STUDENT_PERSONAS flags this design guidance itself as "inferred — flag for human review"). This single directive drives all session chunking below; if the human rejects it, the chunking in §5 needs to be redone, not patched.

---

## 2. DesiredResult nodes (one per GOALS objective)

| id | key | description | knowledge_type | provenance |
|---|---|---|---|---|
| DR-01 | deploy-gateway-gke | Stand up a Spring Cloud Gateway instance and deploy it to GKE (G1) | procedural | [stated] |
| DR-02 | strangler-routing | Configure path-based route splitting: `/legacy/**` → legacy, new paths → migrated services (G2) | procedural | [stated] |
| DR-03 | validate-jwt-cors | Validate incoming Entra ID JWT at the gateway and apply CORS (G3) | procedural | [stated] |
| DR-04 | mint-downstream-token | Mint a custom downstream token emulating the legacy app's token, propagate it (G4) | procedural | [stated] |
| DR-05 | otel-tracing | Gateway participates in / initiates OpenTelemetry trace-context propagation (G5) | procedural | [stated] |

---

## 3. Prerequisite nodes (backward decomposition, stopped at baselines)

| id | key | description | knowledge_type | provenance | skippable by |
|---|---|---|---|---|---|
| PRQ-01 | strangler-fig-pattern | The strangler-fig migration pattern: incremental cutover via traffic splitting, coexistence window | contextual | [stated] | nobody — shared opening framing; deliberate root, see §4 amendment |
| PRQ-02 | scg-route-model | Spring Cloud Gateway as a reverse proxy: Route / Predicate / Filter architecture | declarative | [inferred] | nobody — shared vocabulary node, but reached via *different* enabling baselines per persona (see §4 amendment) |
| PRQ-03 | gke-workload-primitives | GKE deployment primitives for a gateway workload (Deployment, Service, Ingress/Gateway API) | declarative | [inherited_inferred] | Ops (holds BSL-04) — taught explicitly for devs |
| PRQ-04 | containerize-gateway-app | Packaging the gateway app as a container image | procedural | [inferred] | nobody, but light-touch for Ops (near BSL-02) |
| PRQ-05 | externalize-gateway-config | Externalizing gateway config for a GKE workload (ConfigMap/env, profiles) | procedural | [inferred] | nobody |
| PRQ-06 | path-based-predicate-config | Configuring path predicates to split traffic legacy vs. migrated | procedural | [stated] | nobody |
| PRQ-07 | oidc-jwt-validation-concepts | OAuth2/OIDC token validation concepts: issuer, signature, claims | declarative | [inferred] | Ops go conceptual-only; devs go deep |
| PRQ-08 | entra-id-issuer-jwks | Entra ID as issuer: tenant, JWKS endpoint, issuer/audience specifics | declarative | [inherited_inferred] | Ops go conceptual-only |
| PRQ-09 | scg-jwt-filter-config | Spring Cloud Gateway JWT-validation filter/security chain | procedural | [stated] | Ops (config-lane variant: verifying validation via gateway logs/config, not writing the filter) |
| PRQ-10 | cors-config-gateway | CORS configuration at the gateway | procedural | [stated] | nobody — natural config-lane shared task |
| PRQ-11 | reactive-filter-execution-model | Reactive (WebFlux) execution model of a `GatewayFilter`/`GlobalFilter`: non-blocking chain, why blocking calls inside a filter break it | contextual | [stated] (Persona A autonomy metric names this explicitly) | Ops — dev-lane only |
| PRQ-12 | legacy-token-contract | The legacy application's existing token shape/claims that the minted token must imitate | declarative | [risk] | nobody — **content unknown, blocks concrete exercise authoring; deliberate root, see §4 amendment** |
| PRQ-13 | custom-token-minting-filter | Pattern for a custom `GlobalFilter` that mints a token from validated incoming claims | procedural | [stated] | Ops — dev-lane; Ops config-lane variant: verify minted token is attached (inspect headers), not author the filter |
| PRQ-14 | token-propagation-downstream | Propagating the minted token to downstream calls via header injection in the filter chain | procedural | [inferred] | Ops — same split as PRQ-13 |
| PRQ-15 | distributed-tracing-concepts | Distributed tracing concepts: trace/span, context propagation across hops | declarative | [inferred] | nobody — shared vocabulary |
| PRQ-16 | otel-instrumentation-scg | OpenTelemetry instrumentation inside Spring Cloud Gateway (auto vs. custom spans) | procedural | [inferred] | Ops — dev-lane |
| PRQ-17 | otel-collector-gke-wiring | Wiring an OTel collector/exporter for the gateway workload on GKE | procedural | [inferred] | devs — ops-lane |

---

## 4. Edges (`A Enables B`)

```
BSL-02 (docker)         Enables  PRQ-04 (containerize)
BSL-04 (gke/ops)        Enables  PRQ-03 (gke primitives)   [Ops already holds this]
BSL-03 (spring/devs)    Enables  PRQ-02 (route model)      [devs already holds substrate]
BSL-01 (rest)           Enables  PRQ-02 (route model)      [Ops substrate: routing is an HTTP/REST concept even without Spring — amendment, see below]
BSL-02 (docker)         Enables  PRQ-02 (route model)      [Ops substrate: a Route/Filter chain is reasoned about the same way as a container's request path — amendment, see below]
BSL-04 (gke/ops)        Enables  PRQ-02 (route model)      [Ops substrate: reverse-proxy config sits on top of infra Ops already runs — amendment, see below]
BSL-01 (rest)           Enables  PRQ-07 (oidc concepts)
BSL-01 (rest)           Enables  PRQ-10 (cors config)      [CORS is an HTTP/REST-adjacent concept — amendment, see below]
BSL-01 (rest)           Enables  PRQ-15 (tracing concepts) [tracing reasons about a chain of HTTP calls — amendment, see below]
BSL-03 (spring/devs)    Enables  PRQ-11 (reactive filter model) [WebFlux is a Spring Boot execution model — amendment, see below]

PRQ-01 (strangler fig)  Enables  DR-02 (strangler routing)
PRQ-01 (strangler fig)  Enables  PRQ-02 (route model)        [framing motivates the architecture]

PRQ-02 (route model)    Enables  PRQ-06 (path predicates)
PRQ-02 (route model)    Enables  PRQ-05 (externalize config)
PRQ-02 (route model)    Enables  PRQ-09 (jwt filter)
PRQ-02 (route model)    Enables  PRQ-13 (token-minting filter)
PRQ-02 (route model)    Enables  PRQ-10 (cors config)        [CORS is configured as gateway filter/global config — amendment, see below]
PRQ-02 (route model)    Enables  PRQ-11 (reactive filter model) [WebFlux gotchas are gotchas of *this* filter chain specifically — amendment, see below]

PRQ-03 (gke primitives) Enables  PRQ-05 (externalize config)
PRQ-04 (containerize)   Enables  PRQ-05 (externalize config)
PRQ-05 (externalize config) Enables DR-01 (deploy gateway)
PRQ-03 (gke primitives) Enables  PRQ-17 (otel collector wiring)
DR-01 (deploy gateway)  Enables  PRQ-17 (otel collector wiring)   [need a running workload to wire a collector against — SCHEMA DEVIATION: DesiredResult→Prerequisite, not Prerequisite→Prerequisite/DesiredResult; kept deliberately, flagged rather than hidden — see §4 amendment]

PRQ-06 (path predicates) Enables DR-02 (strangler routing)

PRQ-07 (oidc concepts)  Enables  PRQ-08 (entra id specifics)
PRQ-08 (entra id specifics) Enables PRQ-09 (jwt filter)
PRQ-08 (entra id specifics) Enables PRQ-13 (token-minting filter)   [minted token built from validated claims]
PRQ-09 (jwt filter)     Enables  DR-03 (validate jwt/cors)
PRQ-10 (cors config)    Enables  DR-03 (validate jwt/cors)

PRQ-11 (reactive model) Enables  PRQ-13 (token-minting filter)   [outbound call inside a filter must stay non-blocking]
PRQ-12 (legacy token contract) Enables PRQ-13 (token-minting filter)
PRQ-13 (token-minting filter) Enables PRQ-14 (token propagation)
PRQ-14 (token propagation) Enables DR-04 (mint downstream token)

PRQ-15 (tracing concepts) Enables PRQ-16 (otel instrumentation)
PRQ-15 (tracing concepts) Enables PRQ-17 (otel collector wiring)
PRQ-16 (otel instrumentation) Enables DR-05 (otel tracing)
PRQ-17 (otel collector wiring) Enables DR-05 (otel tracing)
```

### 4.1 Amendment — root audit and graph fixes (post-review)

A review of §4 tabulated by *target* found four nodes that were never the destination of an edge, i.e.
branches that did not terminate in a `Baseline` as the method requires. Resolved as follows:

- **PRQ-01 (strangler-fig pattern) and PRQ-12 (legacy token contract) are deliberate roots**, not missing
  edges. PRQ-01 is the course's opening problem framing — it motivates the material rather than resting on
  a prior baseline; nothing in STUDENT_PERSONAS/LOGISTICS is its prerequisite. PRQ-12 is a root because its
  content is genuinely unknown (`[risk]`, §7) — there is nothing to decompose it from until the client
  supplies the legacy token's shape. Both are intentionally left un-enabled; this is not an oversight.
- **PRQ-10 (CORS), PRQ-11 (reactive filter model), PRQ-15 (tracing concepts) were unexplained roots — fixed.**
  Added `BSL-01 → PRQ-10`, `PRQ-02 → PRQ-10` (CORS is an HTTP/REST concept, configured as a gateway
  filter); `BSL-03 → PRQ-11`, `PRQ-02 → PRQ-11` (the reactive/WebFlux execution model is a property of
  Spring Boot generally and of *this* filter chain specifically — the reviewer's suggested edge); and
  `BSL-01 → PRQ-15` (distributed tracing reasons about a chain of HTTP calls, which REST already gives the
  learner a vocabulary for). All three now terminate correctly.
- **BSL-03 (Spring Boot) was the sole enabler of PRQ-02, but only the 2 devs hold BSL-03** — Ops had no
  graph-level path into the shared vocabulary node, only a narrative one (§6's lane split). Not intentional;
  fixed by adding `BSL-01 → PRQ-02`, `BSL-02 → PRQ-02`, `BSL-04 → PRQ-02`: Ops reach the Route/Predicate/Filter
  model through REST + Docker + GKE/infra experience as substrate, devs additionally through Spring Boot.
  The node is genuinely reachable by both personas now, not just taught to both.
- **`DR-01 Enables PRQ-17` is a `DesiredResult → Prerequisite` edge**, outside the declared schema
  (`Prerequisite → Prerequisite | DesiredResult`). Kept as a deliberate modeling choice — an OTel collector
  can only be wired against a workload that is already running, so the dependency is real — but it is a
  schema deviation and is now flagged inline rather than passing unnoticed.

---

## 5. Cycles and depth-staging (spiral)

**No genuine cycle was found in the graph above** — every arrow resolves in one direction once
`PRQ-01`/`PRQ-02` are placed first. There *is*, however, a real bidirectional coupling between
**DR-01 (deploy)** and **DR-02 (routing)**: a route configuration is only verifiable once *something*
is deployed to route to, and a GKE deployment is only meaningfully testable once it carries at least
one route. Rather than force an artificial single-pass order, DR-01/DR-02 are deliberately staged in
two passes of increasing depth — Kolb's repetition-through-variation, not a forced order-break:

- **Pass 1 (session 1, shallow):** one path-based route, deployed to GKE, traffic verified reaching a
  stub and legacy. Concrete Experience the learner can reflect on before any of the JWT/token/tracing
  material is introduced.
- **Pass 2 (session 2, deep):** full `/legacy/**` split, redeploy with security (DR-03), token minting
  (DR-04) and tracing (DR-05) wired in. Active Experimentation on the same object at higher complexity.

This is the single spiral in the graph; nothing else required it.

---

## 6. Session chunking (2 × 4h, one week apart, Teams, mixed room)

### Session 1 — Shared vocabulary + shallow deploy/route pass

1. **Open on the problem** *(invented_framing — no session-level framing script exists in SSOT, constructed here)*: the strangler-fig migration and the one-month deadline (`PRQ-01`).
2. **Shared vocabulary**: `PRQ-02` (route/predicate/filter model) — taught once, to the whole room, before any lane split, per the cross-persona directive.
3. **Lane split**:
   - *Code lane (devs)*: write one path-based route (`PRQ-06`, shallow pass); containerize it (`PRQ-04`).
   - *Config-and-operate lane (Ops)*: GKE workload primitives (`PRQ-03` — skippable, Ops already holds `BSL-04`, so this slot becomes their *teaching* role/support for devs rather than new content for them); externalize config (`PRQ-05`).
4. **Reconverge**: deploy the minimal gateway to GKE together (`DR-01` pass 1) and confirm the one route splits traffic (`DR-02` pass 1).

**Between-session homework** *(LOGISTICS states this is feasible and should be planned — not optional)*:
- Devs: read the tenant's Entra ID issuer/JWKS configuration (pre-read for `PRQ-08`); skim reactive/WebFlux filter-chain gotchas (`PRQ-11`).
- Ops: confirm GKE namespace/access and OTel collector availability on the cluster (pre-req for `PRQ-17`); confirm each participant's JDK + IDE + Docker + `gcloud`/GKE access ahead of session 1 in the first place *(this line item is itself `[inherited_inferred]` from LOGISTICS — carried forward, not re-invented)*.

### Session 2 — Depth pass: security, token minting, tracing, redeploy

1. **Recap** session 1's deploy/route pass (Reflective Observation → Abstract Conceptualization bridge).
2. **Full strangler split** (`PRQ-06` deep pass → `DR-02` complete).
3. **Incoming auth** — shared: `PRQ-07` → `PRQ-08`; lane split: devs build `PRQ-09` (JWT filter), Ops verify via gateway logs/config; both configure `PRQ-10` (CORS) → `DR-03`.
4. **Downstream token minting** — dev-lane heavy: `PRQ-11` (reactive model), `PRQ-12` (legacy token contract — **`[risk]`, see §7**), `PRQ-13`, `PRQ-14` → `DR-04`. Ops-lane role: verify the minted token is attached by inspecting headers/logs, not authoring the filter.
5. **Tracing** — shared: `PRQ-15`; lane split: devs `PRQ-16` (instrumentation), Ops `PRQ-17` (collector wiring on GKE, built on `DR-01`) → `DR-05`.
6. **Redeploy** the full gateway to GKE (`DR-01` pass 2, deep) and validate end to end.
7. **Optional autonomy menu** *(time-permitting, dev-lane, per sequencing step 5 / Marco's autonomy metric)*: custom `GlobalFilter` composition patterns beyond token-minting, rate limiting, retry/circuit-breaker on the legacy leg. Offered only after items 1–6 are satisfied; first to be dropped if time runs out.

---

## 7. Open items for human sign-off

- **`[risk]` — Session 2 is overloaded.** It currently carries DR-02 depth + DR-03 + DR-04 + DR-05 + a redeploy, in 4h, remote, with a two-lane split on every block. This is a scope/coverage risk, not a sequencing error — the dependency order above is sound, but the *time budget* is not self-evidently deliverable. Mitigation options for the human to pick from, not decided here:
  - (a) Make `DR-05` (tracing) a guided demo rather than hands-on for everyone, with Ops only wiring the collector and devs watching instrumentation rather than writing it;
  - (b) Move `PRQ-10` (CORS) to asynchronous/config-lane pre-work before session 2, since it doesn't need the room;
  - (c) Accept the load and extend session 2, or add a short session 3 — outside current LOGISTICS (`2×4h`), needs client approval.
- **`[risk]` — `PRQ-12` (legacy token contract) has no content.** GOALS states the *intent* (mint a token that imitates the legacy app's existing token) but not the actual claim set/format. This is enough to sequence — the node is correctly placed — but it is a **materials-authoring blocker**: the client must supply the legacy token's actual shape before a concrete session-2 exercise for `PRQ-12`/`PRQ-13` can be authored.
- **`[inherited_inferred]` — the two-lane (code / config-and-operate) design directive** that shapes every session-1 and session-2 block is flagged as inferred in STUDENT_PERSONAS itself. If the human rejects this directive, §6's chunking needs to be redone, not patched — it is the load-bearing assumption behind the whole session structure.
- **`[inherited_inferred]` — devs' gap on GKE specifics and Entra ID internals**, and the lab-access precondition (JDK/IDE/Docker/`gcloud` confirmed before session 1) — both carried forward from LOGISTICS/STUDENT_PERSONAS, not newly invented, but still worth a human glance since they gate whether session 1 can start on time.
- **`[invented_framing]` — the "open on the problem" framing text in §6** is a construction, not a quote from any store; STUDENT_PERSONAS/GOALS give the *content* (strangler fig, one-month deadline) but no session-opening script. Downstream materials authoring should treat it as a draft, not a fixed line.
- **Schema note**: per the task instruction to tag provenance on every node, `provenance_tags` was added to all `Prerequisite` rows in §3 even though the `Prerequisite` schema in this role's own definition does not list that field for `Prerequisite` (only for `DesiredResult`/`Baseline`). Noted here as a compliance choice driven by the instruction, not as an independently-found defect in the agent definition.
