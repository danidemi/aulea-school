# DESIGN — Knowledge/Goals Graph

*SSOT store — sole writer: learning-curriculum-architect. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**

## Persona roster

| id | Persona | Role | Cohort count |
|---|---|---|---|
| P-DEV | Marco | Java Developer — owns gateway's Spring code | 2 |
| P-OPS | Sara | Ops Engineer — configures/deploys/operates, no Java | 2 |

## Baseline nodes

| id | key | description | knowledge_type | held_by | provenance_tags |
|---|---|---|---|---|---|
| BSL-REST | rest | REST/HTTP as the protocol carrying requests, headers and tokens between client, gateway and services. | declarative | P-DEV, P-OPS | [stated] |
| BSL-DOCKER | docker | Containers and Docker: images, running/inspecting containers. | procedural | P-DEV, P-OPS | [stated] |
| BSL-SPRING | spring-boot | Spring Boot fundamentals: application structure, configuration, beans. | procedural | P-DEV | [stated] |
| BSL-GKE-OPS | gke-ops | Operational familiarity with GKE/container orchestration (clusters, workloads, services). | procedural | P-OPS | [stated] |

## DesiredResult nodes

| id | key | description | knowledge_type | audience | skippable_by | persona_variant | provenance_tags |
|---|---|---|---|---|---|---|---|
| DR-DEPLOY-GATEWAY | deploy-gateway | Stand up a Spring Cloud Gateway instance and deploy it to a GKE cluster. | procedural | all | — | P-DEV: packages/ships the gateway application. P-OPS: executes/owns the cluster-side deployment. | [stated] |
| DR-STRANGLER-ROUTING | strangler-routing | Configure path-based route splitting so `/legacy/**` reaches the legacy system and new paths reach migrated microservices. | procedural | all | — | P-DEV: authors the route/predicate configuration. P-OPS: verifies the traffic actually splits as configured. | [stated] |
| DR-VALIDATE-AUTH | validate-auth | Validate an incoming JWT issued by Microsoft Entra ID at the gateway and apply CORS. | procedural | all | — | P-DEV: implements the validation filter/config. P-OPS: configures Entra tenant/client identifiers and CORS allowed origins, verifies rejection/acceptance behavior. | [stated] |
| DR-MINT-TOKEN | mint-token | At the gateway, mint a custom internal token emulating the token the legacy application already expects, and propagate it downstream. | procedural | [P-DEV] | — | — | [stated] [risk] |
| DR-TRACE-PROPAGATION | trace-propagation | Have the gateway participate in or initiate OpenTelemetry tracing, propagating trace context across gateway → microservices → legacy. | procedural | all | — | P-DEV: adds/verifies tracing instrumentation in the gateway's code. P-OPS: configures/operates the OpenTelemetry collector pipeline in the cluster and confirms trace continuity. | [stated] [risk] |

## Prerequisite nodes

| id | key | description | knowledge_type | audience | skippable_by | persona_variant | root | root_rationale | depth_staging | provenance_tags |
|---|---|---|---|---|---|---|---|---|---|---|
| PRQ-STRANGLER-FRAMING | strangler-framing | The strangler-fig migration pattern: moving traffic from a legacy app to new microservices incrementally while both coexist, and why an edge gateway is the seam that makes the cutover safe, reversible and time-boxed. | contextual | all | — | — | true | Opening problem framing pinned in GOALS ("The real problem"); motivates the whole course and rests on no prior knowledge, so nothing enables it. | — | [stated] |
| PRQ-GATEWAY-ROLE | gateway-role | Spring Cloud Gateway's role as the edge/reverse-proxy component that sits in front of legacy and migrated services. | declarative | all | — | — | — | — | — | [inferred] |
| PRQ-SCG-MODEL-SHALLOW | scg-model-shallow | Spring Cloud Gateway's route/predicate/filter model at configuration level: what a route, a predicate and a filter are and how they compose to direct a request. | declarative | all | — | — | — | — | pass 1 — shallow: config-level vocabulary shared by both personas, sufficient to deploy, split routes, and reason about where auth/CORS/tracing filters attach. | [inferred] |
| PRQ-SCG-MODEL-DEEP | scg-model-deep | Authoring a custom `GlobalFilter`/`GatewayFilter` in Java, including WebFlux/reactive execution gotchas (non-blocking chain, order, mutating the exchange). | procedural | [P-DEV] | — | — | — | — | pass 2 — deep: code-level authoring, reached only where the objective requires writing gateway-side Java (token minting). | [inferred] |
| PRQ-GKE-DEPLOY-CONCEPT | gke-deploy-concept | Packaging a Spring Boot application as a container and deploying/exposing it on GKE (image, Deployment, Service/Ingress). | procedural | all | P-OPS | P-DEV: learns enough to package, deploy and troubleshoot the gateway workload. P-OPS: already holds this operationally; exercises it rather than learning it fresh. | — | — | — | [stated] [inherited_inferred] |
| PRQ-ROUTE-SPLIT-CONCEPT | route-split-concept | Path-based route splitting: using path predicates to send `/legacy/**` to the legacy system and other paths to migrated microservices. | contextual | all | — | P-DEV: authors the path predicates in route configuration. P-OPS: verifies operationally that requests to each path land on the intended upstream. | — | — | — | [stated] [inherited_inferred] |
| PRQ-OIDC-JWT-BASICS | jwt-basics | What a JWT is and contains (header/claims/signature) and how bearer-token authentication works over HTTP. | declarative | all | — | — | — | — | — | [inferred] |
| PRQ-ENTRA-JWT-VALIDATION | entra-jwt-validation | Validating a JWT issued by Microsoft Entra ID at the gateway: checking issuer, audience and signature against Entra's keys. | procedural | all | — | P-DEV: implements the validation filter/Spring Security config. P-OPS: configures Entra tenant/client identifiers and reads/troubleshoots validation failures without writing code. | — | — | — | [stated] [inherited_inferred] |
| PRQ-CORS-CONCEPT | cors-concept | CORS: why browsers block cross-origin calls and how the gateway can be configured to allow specific origins/headers/methods. | contextual | all | — | — | — | — | — | [stated] |
| PRQ-LEGACY-TOKEN-SHAPE | legacy-token-shape | The exact shape of the token the legacy application currently expects: format, header/location, claim set, signing/encoding scheme, expiry — the target the minted token must emulate. | declarative | [P-DEV] | — | — | true | Content not pinned down by any SSOT store (GOALS only says the minted token must "emulate the token the legacy application already expects"); cannot be decomposed further until the client supplies the legacy token's actual format. | — | [risk] |
| PRQ-TOKEN-MINT-CONCEPT | token-mint-concept | Why and when a gateway mints a downstream token shaped like the legacy app's existing token, bridging the validated incoming identity to what legacy/backend code already expects, so that code doesn't need to change immediately. | contextual | all | — | — | — | — | — | [stated] |
| PRQ-TOKEN-MINT-FILTER | token-mint-filter | Authoring the custom gateway filter that mints the emulated legacy token from the validated identity and propagates it to downstream services. | procedural | [P-DEV] | — | — | — | — | — | [stated] [risk] |
| PRQ-DISTRIBUTED-TRACING-CONCEPT | distributed-tracing-concept | Distributed tracing: what a trace and a span are, and how trace context propagates across an HTTP call chain spanning several services. | declarative | all | — | — | — | — | — | [inferred] |
| PRQ-OTEL-GATEWAY-INTEGRATION | otel-gateway-integration | Configuring/instrumenting the gateway so it participates in or initiates OpenTelemetry tracing, propagating trace context to microservices and legacy. | procedural | all | — | P-DEV: adds/verifies the tracing instrumentation and context-propagation code path in the gateway. P-OPS: configures and operates the OpenTelemetry collector pipeline in the cluster, confirms trace continuity end to end. | — | — | — | [stated] [inherited_inferred] [risk] |

## Edges (Enables)

| From (prerequisite) | To (enabled) | Reason |
|---|---|---|
| PRQ-STRANGLER-FRAMING | PRQ-GATEWAY-ROLE | The migration rationale explains why an edge component is needed at all, before describing what Spring Cloud Gateway is. |
| PRQ-GATEWAY-ROLE | DR-DEPLOY-GATEWAY | Knowing the gateway's edge/reverse-proxy role precedes standing one up. |
| PRQ-GATEWAY-ROLE | PRQ-SCG-MODEL-SHALLOW | The route/predicate/filter model is Spring Cloud Gateway's concrete realization of the edge role just introduced. |
| BSL-DOCKER | PRQ-GKE-DEPLOY-CONCEPT | Deploying to GKE builds on already knowing containers. |
| PRQ-GKE-DEPLOY-CONCEPT | DR-DEPLOY-GATEWAY | The gateway must be packaged and deployed to the target cluster. |
| PRQ-SCG-MODEL-SHALLOW | PRQ-SCG-MODEL-DEEP | Depth-staging edge: pass 1 (config vocabulary) precedes pass 2 (authoring custom filter code). |
| PRQ-SCG-MODEL-SHALLOW | PRQ-ROUTE-SPLIT-CONCEPT | Path-based routing is expressed through the route/predicate model already introduced. |
| PRQ-ROUTE-SPLIT-CONCEPT | DR-STRANGLER-ROUTING | Configuring the split requires understanding how routes/predicates select a target upstream by path. |
| BSL-REST | PRQ-OIDC-JWT-BASICS | JWTs travel as bearer tokens over HTTP; HTTP literacy precedes them. |
| PRQ-OIDC-JWT-BASICS | PRQ-ENTRA-JWT-VALIDATION | Must know what a JWT is/contains before validating one issued by a specific identity provider. |
| PRQ-SCG-MODEL-SHALLOW | PRQ-ENTRA-JWT-VALIDATION | Validation is applied as a gateway filter, so the filter model must precede it. |
| PRQ-ENTRA-JWT-VALIDATION | DR-VALIDATE-AUTH | Direct: JWT validation is the core of the objective. |
| BSL-REST | PRQ-CORS-CONCEPT | CORS is an HTTP-level cross-origin mechanism. |
| PRQ-CORS-CONCEPT | DR-VALIDATE-AUTH | GOALS bundles CORS with JWT validation as one objective. |
| PRQ-ENTRA-JWT-VALIDATION | PRQ-TOKEN-MINT-CONCEPT | Minting a downstream token requires a validated incoming identity to mint it from. |
| PRQ-LEGACY-TOKEN-SHAPE | PRQ-TOKEN-MINT-CONCEPT | Emulating the legacy token requires knowing what shape is being emulated. |
| PRQ-TOKEN-MINT-CONCEPT | PRQ-TOKEN-MINT-FILTER | The bridging rationale must be understood before authoring the filter that implements it. |
| PRQ-SCG-MODEL-DEEP | PRQ-TOKEN-MINT-FILTER | Minting and injecting a token downstream requires authoring a custom `GlobalFilter`/`GatewayFilter`. |
| PRQ-TOKEN-MINT-FILTER | DR-MINT-TOKEN | Direct: this filter is the objective. |
| BSL-REST | PRQ-DISTRIBUTED-TRACING-CONCEPT | Trace context propagates over HTTP headers across the call chain. |
| PRQ-DISTRIBUTED-TRACING-CONCEPT | PRQ-OTEL-GATEWAY-INTEGRATION | Must know what a distributed trace is before instrumenting a component to participate in one. |
| PRQ-GKE-DEPLOY-CONCEPT | PRQ-OTEL-GATEWAY-INTEGRATION | The OpenTelemetry collector pipeline runs in the same cluster the gateway is deployed to. |
| PRQ-SCG-MODEL-SHALLOW | PRQ-OTEL-GATEWAY-INTEGRATION | Trace instrumentation hooks into the gateway's filter chain. |
| PRQ-OTEL-GATEWAY-INTEGRATION | DR-TRACE-PROPAGATION | Direct: this is the objective. |

## Depth staging

- **PRQ-SCG-MODEL** (route/predicate/filter model), visited twice:
  - Pass 1 — shallow (`PRQ-SCG-MODEL-SHALLOW`): configuration-level vocabulary — what a route, predicate and filter are, and how requests flow through the chain. Enough to deploy the gateway, split routes by path, attach the JWT/CORS filter, and hook tracing. Audience: all.
  - Pass 2 — deep (`PRQ-SCG-MODEL-DEEP`): authoring a custom `GlobalFilter`/`GatewayFilter` in Java, including non-blocking/WebFlux execution order and exchange mutation. Reached only for the token-minting objective, which is the sole point in the course requiring gateway-side Java authorship beyond configuration. Audience: P-DEV.
