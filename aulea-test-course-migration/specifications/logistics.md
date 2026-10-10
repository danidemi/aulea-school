# LOGISTICS

*SSOT store — sole writer: requirements-gatherer. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**

| Aspect | Value | Confidence / provenance |
|---|---|---|
| Total length | 8 hours | stated by client |
| Structure | 2 sessions × 4h, **one session per week** | stated by client |
| Delivery mode | Human-taught (instructor-led) | stated by client |
| Sync/async | Synchronous, live | stated by client |
| Platform | Microsoft Teams (remote) | stated by client |
| Language | Italian | stated by client |
| Cohort size | 4 participants | stated by client |
| Audience | Single ICT department, tire-manufacturing company | stated by client |
| Cohort composition | 2 Ops + 2 Java developers | stated by client |
| Target runtime | Google Kubernetes Engine (GKE) | stated by client |

## Prerequisites (assumed)

- **REST** — known by all. *(stated by client)*
- **Docker** — known by all. *(stated by client)*
- **Spring / Spring Boot** — the **2 developers are comfortable**; the **2 Ops do not work with Java** and are not expected to write Spring code. *(stated by client)*

## Design constraints derived from logistics

- **Mixed room, only 8h.** The Ops↔Dev skill split is the dominant design risk: Spring-heavy segments risk losing the Ops pair; pure infra segments risk boring the devs. Material must give both sides a clear role (see personas).
- **One week between sessions** → between-session practice/homework is feasible and should be planned.
- Labs run on Teams remotely; confirm each participant has JDK + IDE + Docker + `gcloud`/GKE access before session 1. *(inferred — flag for human review)*
