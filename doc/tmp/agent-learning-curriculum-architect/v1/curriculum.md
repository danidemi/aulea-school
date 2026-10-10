# CURRICULUM

*SSOT store — sole writer: learning-curriculum-architect. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**
Sequenced from: `specifications/goals.md`, `specifications/student_personas.md`, `specifications/logistics.md`
(read 2026-07-24; this is a first pass, no prior version of this store existed)

Legend for provenance tags used throughout:
- **[stated]** — pinned directly in a spec store (goals/personas/logistics)
- **[inferred]** — architect's dependency judgment, not directly stated; medium confidence
- **[inherited-inferred]** — already flagged "inferred" *in the source spec itself*; carried forward, not re-invented here
- **[invented framing]** — a problem-relevance framing the architect had to construct because personas didn't cover it
- **[risk]** — a scope/coverage risk flagged for human sign-off, not a content tag

---

## 0. Baseline — where decomposition stops (per persona, not per group)

| Assumed known by ALL | Assumed known by DEVS only | Assumed known by OPS only | NOT assumed for anyone |
|---|---|---|---|
| REST **[stated]** | Spring Boot fundamentals **[stated]** | GKE / container operations, Docker at depth **[stated]** | Spring Cloud Gateway specifics |
| Docker (basic) **[stated]** | | | Entra ID / JWT internals |
| | | | OpenTelemetry / distributed tracing |
| | | | Strangler-fig pattern application |

Decomposition rule applied: for **Marco** (dev ×2), branches stop at Spring Boot/REST/Docker — no time spent re-teaching these. For **Sara** (ops ×2), branches stop at Docker/GKE/containers — no time spent re-teaching these, and no branch is ever decomposed down to "read/write Java" for her; wherever a topic would require that, it is reframed as **configuration and observed behavior** instead of source code **[stated — persona B tech/psychological gap]**.

Because the cohort is mixed and 8h is tight, no session forces a learner through a node they already hold: Ops skip the "why Docker" framing, Devs skip the "why containers" framing — both move straight into the GKE‑gateway‑specific material.

**[risk — inherited-inferred]** Pre-session-1 environment check (JDK, IDE, Docker, `gcloud`/GKE access confirmed for all 4 participants) is listed in LOGISTICS as inferred, not client-confirmed. This curriculum assumes it happens *before* Session 1; if it doesn't, Unit 1.1's Concrete Experience has no runway. Flagged for human sign-off — someone must own sending this checklist out.

---

## 1. Prerequisite graph

Nodes = topics carrying the objectives. Edges = "must be understood/available before."

```
[REST, Docker — baseline, all]         [Spring Boot — baseline, devs only]
        |                                        |
        v                                        v
 [GKE deploy model: Deployment/Service/Probes]   [SCG core concepts: route/predicate/filter]
        |                                        |
        \_______________________  ______________/
                                \/
                    [G1 — Deploy gateway to GKE]
                                |
                                v
              [Strangler-fig routing concept: path split]
                                |
                                v
                  [G2 — path-based route splitting]
                                |
                                v
             [OAuth2 Resource Server pattern + JWKS/Entra ID]
                                |
                                v
              [G3 — validate incoming JWT + CORS]
                                |
                                v
          [Token relay/translation pattern (legacy token shape)]
                                |
                                v
             [G4 — mint downstream legacy-shaped token]
                                |
                                v
        (converges with tracing thread below at the close)

[OpenTelemetry basics: trace context propagation]  -- spiral, cuts across all of the above
        |                                  \
        v (shallow pass, in S1)             v (deep pass, in S2)
 [G5a — trace appears for deploy+route]   [G5b — trace correlates auth+token+legacy hop]
```

### Edge-by-edge provenance

| Edge | Tag | Note |
|---|---|---|
| Spring Boot baseline → SCG core concepts | **[stated]** | Devs' comfort with Spring stated directly; SCG itself is new to everyone |
| GKE deploy model → G1 | **[stated]** | G1 literally *is* "stand up + deploy to GKE" |
| SCG core concepts → G1 | **[inferred]** | Can't meaningfully deploy a gateway without knowing what a route/filter is, even minimally |
| G1 → G2 | **[inferred]** | Chosen as staged, not a true cycle: you *could* write routing config before deploying, but verifying a path-split requires a reachable instance. Treated as one shallow-then-deep cluster (see §3) rather than a hard prerequisite, to avoid a false precedence |
| Strangler-fig concept → G2 | **[stated]** | Path-based split rule is client-stated |
| G2 → G3 | **[inferred]** | Securing a route presupposes the route exists to secure |
| OAuth2/JWKS/Entra ID → G3 | **[stated]** | Identity provider stated by client; JWT-validation pattern is the standard mechanism, medium-low novelty risk |
| G3 → G4 | **[inferred]** | Must validate the incoming identity *before* minting a downstream identity that stands in for it — this is the architect's sequencing judgment, not a client statement |
| Token relay/translation pattern → G4 | **[stated]** | Purpose (avoid touching legacy code) is client-stated |
| OTel basics → G5a/G5b | **[stated]** | G5 objective as written; split into shallow/deep pass is **[inferred]**, driven by time budget, see §3 |
| G1/G2 → G5a | **[inferred]** | Can't show a trace span for a request that has nowhere to route to yet |
| G3/G4 → G5b | **[inferred]** | Deep trace correlation deliberately reuses the auth+token hop just built, so it must come after both |

**[risk]** G3's assumed novelty ("medium-low") for Entra ID/JWT specifics is **[inherited-inferred]** from persona A ("likely thinner on... Entra ID token internals... inferred — flag for human review") — carried forward here, not resolved. If Entra ID is genuinely unfamiliar to devs too, Unit 2.1's AC block may need more time than allotted.

---

## 2. Handling the one apparent cycle: G1 ↔ G2

Deploying a gateway with nothing to route feels artificial; designing routes with nothing to deploy them to is equally artificial. Rather than impose a false order, this is treated as a **single cluster, staged by depth** (spiral, not sequence-fabrication):

1. **Shallow pass (Unit 1.1):** deploy a minimal gateway with a trivial default route, just to get something running in GKE.
2. **Deep pass (Unit 1.2):** revisit the same deployment and add the real strangler-fig path-split routing, redeploying with updated config.

This mirrors Kolb's repetition-through-variation: the learner touches "deploy + route" twice, at increasing complexity, rather than once in an artificial full-detail pass.

---

## 3. G5 (tracing) — explicit spiral treatment, not garnish

G5 is a stated objective ("traceable by a later quiz/exercise" — GOALS line 11), not a demo add-on. It is deliberately spiraled across both sessions because it is cross-cutting (touches deployment, routing, auth, and token minting all at once) and because 8h is not enough to teach it as a single dense block without crowding G1–G4.

- **G5a (Session 1, end of Unit 1.1):** learners enable the default OTel exporter on the deployed gateway and **observe a real trace span for their own request** in a shared collector/console view. This is a genuine Concrete Experience, not an instructor demo.
- **G5b (Session 2, Unit 2.3 — its own named ~30 min block, deliberately not folded into Unit 2.2):** learners are given a gateway+route+auth+token pipeline that is *missing one propagation hop* (e.g., the downstream call drops the trace header) and must **add the missing hop themselves** and watch the trace complete end-to-end across gateway → microservice → legacy stub. Ops verify the trace in the collector UI; devs fix the header propagation in code — both have a hands-on role.

**[risk]** Flagged for human review: with 5 objectives in 8h, G5 unavoidably gets the thinnest treatment of the five — it is compressed to a ~20 min shallow touch (G5a) plus a ~30 min deep pass (G5b), versus a full unit's worth of time for G1-G4 individually. Giving it its own named Unit 2.3 (rather than silently squeezing it into Unit 2.2's tail) keeps it a genuine do-and-observe exercise, and Session 2's optional menu is the explicit item that yields time to it if the session runs long — but a human should confirm this compressed scope is acceptable for a client-stated objective.

---

## 4. Cross-persona lane design (applies to every hands-on unit)

Per the cross-persona directive **[inherited-inferred — personas.md line 35]**, every hands-on block runs: **shared vocabulary → split lanes → reconverge.** The reconverge step is mandatory and explicit in every unit below — it is not enough for each lane to finish separately; the unit closes with both lanes verifying they built one working system together. This reconverge doubles as the unit's start of Reflective Observation.

Additionally, per andragogy's "use peer experience as a teaching resource": wherever one lane's persona is strong and the other thin on that specific topic, the strong side is asked to **narrate/mentor**, not just work in parallel — this defuses both named risks (Marco bored in infra-heavy stretches, Sara lost in code-heavy stretches) at no extra time cost.

| Unit | Devs (code lane) role | Ops (config/operate lane) role | Peer-teaching direction |
|---|---|---|---|
| 1.1 Deploy | Adjust/inspect the Spring Boot app & its Dockerfile | Write k8s manifests, deploy, expose service, read probes | Ops → Devs (Ops mentors devs on GKE specifics — devs' flagged gap) |
| 1.2 Routing | Write predicates/filters for path-split routes | Verify traffic actually splits (curl/Teams demo, check both legacy & new stub receive expected paths) | Devs → Ops (devs narrate what a route/predicate does in plain terms) |
| 2.1 JWT + CORS | Write the JWT validation / CORS filter config in Spring | Wire Entra ID app registration values, verify 401→200 behavior from the outside, check CORS preflight in browser dev tools | Devs → Ops (concept explained as "gatekeeper behavior", not code) |
| 2.2 Token minting | Write the `GlobalFilter` that mints the legacy-shaped token | Own **verification**: confirm the legacy stub accepts the minted token, inspect claims via logs, confirm nothing broke downstream | Devs → Ops, but Ops role reframed as observability/verification owner, not passive audience — addresses advisor note on avoiding busywork |
| 2.3 G5b closing (own named block) | Fix the missing trace-propagation hop in code | Watch the trace complete in the collector, confirm the full gateway→microservice→legacy span chain | Both — shared reconverge moment closing the whole course |

---

## 5. The sequence — sessions, spine, and per-session experiential cycle

Sized to LOGISTICS: 2 sessions × 4h, one week apart, synchronous on Teams, cohort of 4 (2 dev + 2 ops) **[stated]**.

**Spine (ordered problems, one per unit):**
1. "Get *something* running in GKE that answers as a gateway." (G1, shallow)
2. "Split traffic so `/legacy/**` goes to the legacy system and everything else goes to the new service — the actual strangler-fig cutover." (G1 deep + G2)
3. "Nothing should reach a route without a valid Entra ID identity, and browser calls need to survive CORS." (G3)
4. "The legacy app still expects its old token shape — mint one at the gateway so legacy code doesn't have to change this month." (G4)
5. "Prove the whole path — gateway, new service, legacy — shows up as one connected trace." (G5, deep pass, course-closing reconverge)

These problems are drawn directly from the stated triggers: G1–G2 from the shared "strangler fig... keep the dual-environment window short" framing (GOALS line 9); G3/G4 from Marco's stated ownership of gateway logic and Sara's stated deploy/config role (PERSONAS lines 13, 23); G5 from the stated tracing objective. **No invented framing was required for the spine** — the client-stated triggers cover it. (This differs from the advisor's default expectation of an "invented framing" flag; noted explicitly because there is none to report here beyond what's already inherited.)

---

### SESSION 1 — "Stand the gateway up and make the strangler-fig split real" (4h)

Objectives covered: **G1, G2**, plus **G5a** (tracing, shallow pass).

**Time budget for this session (real, not aspirational):** Unit 1.1 and Unit 1.2 are each ~1h45 of *core* content, not a flat 2h — the remaining ~30 min across the session covers a ~15-20 min break plus transition/reconverge overhead in a remote Teams block. The optional menu (~15-20 min) is the explicit **pressure-release valve**: if either core unit runs long, the menu is what yields first, in this order — drop it entirely, then trim it to a 5-min instructor-narrated mention rather than hands-on. Core objectives (G1, G2, G5a) are never the thing that gets cut.

**Pre-session-1 (homework, before Unit 1.1):** environment check — JDK, IDE, Docker, `gcloud`/GKE access confirmed for all 4 participants. **[risk — inherited-inferred, LOGISTICS line 30]** — someone must own sending/verifying this before the session starts, or Unit 1.1's Concrete Experience has nothing to run against.

#### Unit 1.1 — Deploy a minimal gateway to GKE (~1h45 core)
- **Shared vocabulary (10 min):** what a "gateway" is in the strangler-fig picture — one sentence per role: for devs, "your Spring Boot app, containerized"; for ops, "one more workload on the cluster you already run."
- **Concrete Experience:** given a pre-built gateway image and a bare GKE cluster, get a pod running and reachable within a fixed time box. Devs inspect/adjust the Spring Boot app + Dockerfile; Ops write the manifests and deploy.
- **Reconverge / Reflective Observation:** both lanes confirm together the deployed gateway answers a request. Debrief: what broke (image pull, service exposure, probes) and why. Ops mentor devs on the GKE-specific gap **[inherited-inferred — personas.md line 17]**.
- **Abstract Conceptualization:** instructor explains the GKE deployment model (Deployment/Service/readiness probes) and how a Spring Boot app maps onto it; also enables the default OTel exporter here.
- **Active Experimentation / G5a:** redeploy with a small config change (resource limits/env var) and **observe a real trace span** for their own request in a shared collector view — first, shallow touch of G5.

#### Unit 1.2 — Path-based strangler-fig routing (~1h45 core)
- **Concrete Experience:** task — make `/legacy/**` reach a legacy stub and everything else reach a new microservice stub, both already deployed. Devs write predicates/filters; Ops verify the split from outside (curl/Teams demo).
- **Reconverge / Reflective Observation:** debrief on edge cases (path priority, trailing slashes, what happens on an unmatched path). Devs narrate the route/predicate model in plain terms for Ops.
- **Abstract Conceptualization:** instructor formalizes the SCG route/predicate/filter model and the strangler-fig rationale for splitting by path specifically **[stated — routing rule from client]**.
- **Active Experimentation:** extend routing to one more path family — feeds directly into the optional menu below and becomes the concrete opening for Session 2 ("now that real traffic reaches real routes, who's allowed to call them?").

**Optional menu (Session 1, choose one, ~15–20 min, offered once G1+G2 mandatory path is cleared — first thing cut if the session is running long):**
- Weighted/canary routing beyond simple path-split (stretch for fast-moving devs — addresses Marco's "gets bored" risk)
- Comparing GKE Ingress vs. a Gateway-API-native approach (stretch for ops)
- Path rewrite / strip-prefix filters

**Autonomy calibration (method step 5, made explicit):** the cohort splits on the autonomy axis — Marco wants depth and self-direction, Sara wants a clear structured path and is not asked to author code (PERSONAS lines 15, 25). This curriculum resolves that with a single narrow optional menu per session rather than a wide one: enough to give Marco a stretch outlet without leaving Sara without a defined path. This is a deliberate compromise, not a default — a wider menu was considered and rejected given the 8h budget and Sara's stated preference for structure.

**Homework between sessions (1 week gap — feasible per LOGISTICS):**
- Devs: skim Entra ID JWT structure (claims, JWKS endpoint) ahead of Unit 2.1.
- Ops: confirm the OTel collector / logging destination used in Unit 1.1 is still reachable for Session 2.

---

### SESSION 2 — "Make the gateway trustworthy end-to-end, and prove it" (4h)

Objectives covered: **G3, G4**, plus **G5b** (tracing, deep pass, course-closing reconverge).

**Time budget for this session:** this is the tighter of the two sessions, because it carries three objectives (G3, G4, G5b) instead of two. G5b is **not** folded silently into Unit 2.2's time — it gets its own named ~30 min block (Unit 2.3) carved out explicitly, rather than being squeezed as an afterthought at the end of the token-minting unit. The arithmetic: Unit 2.1 ~1h40 core + Unit 2.2 ~1h10 core + Unit 2.3 (G5b) ~30 min + break/transition ~20 min ≈ 3h40, leaving ~20 min as the optional-menu pressure-release valve — same rule as Session 1: menu is first to be cut if running long; G3/G4/G5b are never cut.

#### Unit 2.1 — Validate incoming JWT (Entra ID) + CORS (~1h40 core)
- **Concrete Experience:** call the routed endpoints from a browser-like client with/without a valid Entra ID token; observe 401s and a CORS failure.
- **Reconverge / Reflective Observation:** debrief — what info the gateway needed, where exactly CORS bit. Devs narrate to Ops as "gatekeeper behavior," not code.
- **Abstract Conceptualization:** instructor explains the OAuth2 Resource Server pattern in SCG, JWT validation via Entra ID's JWKS endpoint, and CORS filter configuration. **[risk — inherited-inferred, personas.md line 17]**: this is the block most likely to need more time than budgeted if Entra ID specifics are thinner for devs than assumed — flagged for human check during delivery.
- **Active Experimentation:** apply the same validation to the route extended in Unit 1.2's AE.

#### Unit 2.2 — Mint a downstream legacy-shaped token (~1h10 core)
- **Concrete Experience:** given a validated Entra ID JWT, produce an internal token shaped like the legacy app's existing token and confirm the legacy stub accepts it. Devs write the `GlobalFilter`; **Ops own verification** — confirming the stub accepts the token and inspecting claims via logs (not busywork: this is their meaningful hands-on role in the code-heaviest block).
- **Reconverge / Reflective Observation:** both lanes confirm together the legacy stub behaves as if called by its old token shape, without any legacy code change — the direct payoff stated by the client (GOALS line 18).
- **Abstract Conceptualization:** instructor explains the token relay/translation pattern and why it buys time in a dual-environment migration.
- **Active Experimentation:** apply the pattern to a second downstream service with a differently-shaped claim set — light touch, folds into the reconverge above rather than a separate exercise, to protect time for Unit 2.3.

#### Unit 2.3 — Close the trace, course-closing reconverge (~30 min, named block — not squeezed into 2.2)
- **Concrete Experience / G5b:** learners are handed the same gateway→microservice→legacy pipeline from 2.2 with one trace-propagation hop deliberately missing. Devs fix the header propagation in code; Ops watch the trace in the collector.
- **Reconverge:** both lanes confirm together the full gateway → microservice → legacy span chain now appears as one connected trace — the final shared verification of the whole day, and of G1–G5 together.
- **Abstract Conceptualization (brief):** instructor names what just happened as trace-context propagation across process and protocol boundaries, tying it back to the shallow pass from Unit 1.1 (G5a) — completing the spiral.

**Optional menu (Session 2, choose one, ~15–20 min — first cut if the session runs long; G3/G4/G5b are never cut):**
- Refresh-token / token-caching strategies for the minted downstream token
- Trace sampling configuration / building a simple dashboard view
- CORS preflight edge cases across multiple origins

---

## 6. Objective → session map

| Objective | Session | Unit | Depth |
|---|---|---|---|
| G1 — Deploy gateway | 1 | 1.1 (shallow) + 1.2 revisit (deep) | staged pair, see §2 |
| G2 — Path-based routing | 1 | 1.2 | full |
| G3 — Validate JWT + CORS | 2 | 2.1 | full |
| G4 — Mint downstream token | 2 | 2.2 | full |
| G5 — Tracing | 1 + 2 | 1.1 (G5a, shallow) → 2.3 (G5b, deep, named block) | spiral, see §3 |

---

## 7. Full list of items flagged for human review

1. **[risk — inherited-inferred, LOGISTICS line 30]** Pre-session-1 environment check (JDK/IDE/Docker/`gcloud`/GKE access for all 4) is assumed to happen before Unit 1.1; not client-confirmed. Someone must own this.
2. **[risk — inherited-inferred, PERSONAS line 17]** Devs' GKE-deployment-specifics gap and Entra-ID-internals gap are the architect's *carried-forward* inference from the spec, not newly invented here — but they directly size Unit 1.1's AC and Unit 2.1's AC. Confirm during/after delivery whether these blocks need more time.
3. **[risk — inherited-inferred, PERSONAS line 35]** The two-lane (code / config-operate) directive itself is flagged inferred in the source spec; this curriculum implements it throughout §4 but the underlying judgment (that this split is the right one) has not been separately re-validated here.
4. **[inferred edge]** G1→G2 relationship is staged as a spiral cluster rather than a hard dependency (§2) — a reasonable design choice, not a client statement; flag if a reviewer prefers a stricter split (e.g., teach all routing concepts before any GKE deploy).
5. **[inferred edge]** G3→G4 ("validate incoming before minting outgoing") is the architect's sequencing judgment, not stated by the client. Low risk, but noted per the tagging discipline.
6. **[risk]** G5 gets the thinnest treatment of the five objectives given the 8h budget (~20 min shallow + ~30 min deep vs. a full unit for G1-G4). It now has its own named Unit 2.3 rather than being squeezed into Unit 2.2's tail, and Session 2's optional menu is the designated item that yields time to it if the session runs long — but a human should confirm this compressed scope is acceptable for a client-stated objective.
7. **[note, not a risk]** Session time budgets are stated as ~1h40-1h45 core per major unit, not a flat 2h, to leave room for breaks/transitions in a 4h remote block; the optional menu in each session is the explicit pressure-release valve, always cut before any core objective. This is called out because the first draft of this curriculum was arithmetically over-budget before this pass.
8. **No invented problem framing was needed for the spine** — flagged explicitly (not as a risk, but for completeness) because the method calls for flagging invented relevance, and here the client-stated triggers were sufficient to cover all five sessions' openings.
