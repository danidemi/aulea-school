# DESIGN — knowledge goals graph

*SSOT store — sole writer: learning-curriculum-architect. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**

## Persona roster

| id | persona | role | cohort count |
|---|---|---|---|
| P-DEV | Marco | Java Developer | 2 |
| P-OPS | Sara | Ops Engineer | 2 |

## Baseline nodes

| id | key | description | knowledge_type | held_by | provenance_tags |
|---|---|---|---|---|---|
| BSL-REST | rest | REST/HTTP protocol fundamentals (requests, responses, headers, status codes) | declarative | [P-DEV, P-OPS] | [stated] |
| BSL-DOCKER | docker | Docker fundamentals (images, containers, registries) | procedural | [P-DEV, P-OPS] | [stated] |
| BSL-SPRING | spring | Spring Boot fundamentals | procedural | [P-DEV] | [stated] |
| BSL-GKE | gke | Comfort with GKE/container infrastructure operations | procedural | [P-OPS] | [stated] |

## DesiredResult nodes

| id | key | description | knowledge_type | audience | skippable_by | persona_variant | provenance_tags |
|---|---|---|---|---|---|---|---|
| DR-DEPLOY | deploy-gateway | G1 — Stand up a Spring Cloud Gateway instance and deploy it to a GKE cluster | procedural | all | — | — | [stated] |
| DR-ROUTE-SPLIT | strangler-routing | G2 — Configure path-based route splitting so some paths reach new microservices and others reach the legacy system | procedural | all | — | — | [stated] |
| DR-AUTH-VALIDATE | validate-auth | G3 — Validate incoming Entra ID JWT at the gateway and apply CORS | procedural | all | — | — | [stated] |
| DR-TOKEN-MINT | mint-downstream-token | G4 — Mint a custom internal token emulating the legacy app's expected token, and propagate it downstream | procedural | all | — | Dev authors the minting filter; Ops verifies the token is correctly propagated to downstream services | [stated] |
| DR-TRACING | distributed-tracing | G5 — Have the gateway participate in or initiate OpenTelemetry tracing across gateway → microservices → legacy | procedural | all | — | — | [stated] |

## Prerequisite nodes

| id | key | description | knowledge_type | audience | skippable_by | persona_variant | root | root_rationale | provenance_tags |
|---|---|---|---|---|---|---|---|---|---|
| PRQ-STRANGLER-PATTERN | strangler-pattern | Understand the strangler fig migration pattern: why traffic must be split incrementally between legacy and migrated services | contextual | all | — | — | true | Opening framing: the problem that motivates the whole course rests on no prior knowledge | [invented_framing] |
| PRQ-SCG-BASICS | scg-basics | Understand Spring Cloud Gateway's architecture: the predicate/filter/route triad and its role as the edge component in the migration | declarative | all | — | — | — | — | [inferred] |
| PRQ-ROUTE-PREDICATES | route-predicates | Understand route predicates and path matching | declarative | all | — | — | — | — | [inferred] |
| PRQ-PATH-ROUTING-CONFIG | path-routing-config | Configure path-based routing so `/legacy/**` reaches the legacy system and other paths reach migrated services | procedural | all | — | — | — | — | [stated] |
| PRQ-JWT-CONCEPTS | jwt-concepts | Understand JWT structure and validation: signature, claims, issuer, audience | declarative | all | — | — | — | — | [inferred] |
| PRQ-OIDC-ENTRA | oidc-entra | Understand the OAuth2/OIDC flow and Microsoft Entra ID specifics (issuer, JWKS endpoint, tenant) needed to validate incoming tokens | contextual | all | — | — | — | — | [inferred] |
| PRQ-GATEWAY-JWT-FILTER | gateway-jwt-filter | Configure gateway-level JWT validation against Entra ID | procedural | all | — | Dev wires the Spring Security resource-server configuration; Ops supplies and verifies the issuer/JWKS endpoint values | — | — | [inherited_inferred] |
| PRQ-CORS-CONCEPTS | cors-concepts | Understand CORS: preflight requests, allowed origins/methods/headers | declarative | all | — | — | — | — | [inferred] |
| PRQ-CORS-CONFIG | cors-config | Configure CORS policy at the gateway | procedural | all | — | — | — | — | [stated] |
| PRQ-GATEWAY-FILTER-AUTHORING | gateway-filter-authoring | Author a custom `GlobalFilter`/`GatewayFilter` in Spring Cloud Gateway, including WebFlux/reactive considerations | procedural | [P-DEV] | — | — | — | — | [inferred] [risk: pass-2 depth is a duration-cut candidate if the 8h course runs long] |
| PRQ-LEGACY-TOKEN-SHAPE | legacy-token-shape | Understand the legacy application's expected token format and claims to be emulated | declarative | all | — | — | true | Externally-unknown content: the specs do not pin the legacy token's exact shape; placing it in the graph is the most that can be done until the client supplies it | [risk] |
| PRQ-TOKEN-MINT-PROPAGATE | token-mint-propagate | Mint the internal token emulating the legacy format and propagate it to downstream services via a custom filter | procedural | all | — | Dev authors the minting/propagation filter; Ops verifies the minted token reaches downstream services (e.g. via logs/tracing) | — | — | [risk: pass-2 depth is a duration-cut candidate if the 8h course runs long] |
| PRQ-OTEL-CONCEPTS | otel-concepts | Understand distributed tracing concepts: trace, span, context propagation | declarative | all | — | — | — | — | [inferred] |
| PRQ-OTEL-SCG-INSTRUMENT | otel-scg-instrument | Instrument/enable OpenTelemetry in Spring Cloud Gateway so trace context propagates to downstream services | procedural | all | — | Dev enables/configures the in-app instrumentation library; Ops sets up the OpenTelemetry collector pipeline and verifies end-to-end traces | — | — | [stated] |
| PRQ-GKE-DEPLOY-MODEL | gke-deploy-model | Understand the GKE deployment model: pods, deployments, services, ingress | declarative | all | [P-OPS] | — | — | — | [inherited_inferred] |
| PRQ-CONTAINERIZE-SCG | containerize-scg | Containerize a Spring Cloud Gateway application (build and package a Docker image) | procedural | all | — | — | — | — | [inferred] |
| PRQ-K8S-MANIFEST-SCG | k8s-manifest-scg | Write a Kubernetes deployment manifest for the gateway | procedural | all | — | Ops authors the manifest; Dev reviews/adapts it for gateway-specific configuration (env vars, secrets for Entra ID/OTel endpoints) | — | — | [inferred] |

## Edge list

| Source | Enables | Target |
|---|---|---|
| BSL-REST | Enables | PRQ-SCG-BASICS |
| BSL-SPRING | Enables | PRQ-SCG-BASICS |
| PRQ-STRANGLER-PATTERN | Enables | PRQ-SCG-BASICS |
| PRQ-STRANGLER-PATTERN | Enables | PRQ-PATH-ROUTING-CONFIG |
| PRQ-SCG-BASICS | Enables | PRQ-ROUTE-PREDICATES |
| PRQ-ROUTE-PREDICATES | Enables | PRQ-PATH-ROUTING-CONFIG |
| PRQ-PATH-ROUTING-CONFIG | Enables | DR-ROUTE-SPLIT |
| BSL-REST | Enables | PRQ-JWT-CONCEPTS |
| PRQ-JWT-CONCEPTS | Enables | PRQ-OIDC-ENTRA |
| PRQ-OIDC-ENTRA | Enables | PRQ-GATEWAY-JWT-FILTER |
| PRQ-SCG-BASICS | Enables | PRQ-GATEWAY-JWT-FILTER |
| BSL-REST | Enables | PRQ-CORS-CONCEPTS |
| PRQ-CORS-CONCEPTS | Enables | PRQ-CORS-CONFIG |
| PRQ-SCG-BASICS | Enables | PRQ-CORS-CONFIG |
| PRQ-GATEWAY-JWT-FILTER | Enables | DR-AUTH-VALIDATE |
| PRQ-CORS-CONFIG | Enables | DR-AUTH-VALIDATE |
| PRQ-SCG-BASICS | Enables | PRQ-GATEWAY-FILTER-AUTHORING |
| BSL-SPRING | Enables | PRQ-GATEWAY-FILTER-AUTHORING |
| PRQ-GATEWAY-FILTER-AUTHORING | Enables | PRQ-TOKEN-MINT-PROPAGATE |
| PRQ-LEGACY-TOKEN-SHAPE | Enables | PRQ-TOKEN-MINT-PROPAGATE |
| PRQ-JWT-CONCEPTS | Enables | PRQ-TOKEN-MINT-PROPAGATE |
| PRQ-TOKEN-MINT-PROPAGATE | Enables | DR-TOKEN-MINT |
| BSL-REST | Enables | PRQ-OTEL-CONCEPTS |
| PRQ-OTEL-CONCEPTS | Enables | PRQ-OTEL-SCG-INSTRUMENT |
| PRQ-SCG-BASICS | Enables | PRQ-OTEL-SCG-INSTRUMENT |
| PRQ-OTEL-SCG-INSTRUMENT | Enables | DR-TRACING |
| BSL-DOCKER | Enables | PRQ-GKE-DEPLOY-MODEL |
| BSL-DOCKER | Enables | PRQ-CONTAINERIZE-SCG |
| BSL-SPRING | Enables | PRQ-CONTAINERIZE-SCG |
| PRQ-GKE-DEPLOY-MODEL | Enables | PRQ-K8S-MANIFEST-SCG |
| PRQ-CONTAINERIZE-SCG | Enables | DR-DEPLOY |
| PRQ-K8S-MANIFEST-SCG | Enables | DR-DEPLOY |

## Depth staging

| Node | Pass | What changes |
|---|---|---|
| PRQ-SCG-BASICS | pass 1 — shallow | The predicate/filter/route triad as concepts, and why a gateway is the edge component for this migration |
| PRQ-SCG-BASICS | pass 2 — deep | Reactive/WebFlux execution model underlying the gateway, relevant to authoring custom filters |
| PRQ-PATH-ROUTING-CONFIG | pass 1 — shallow | A single path split: `/legacy/**` to the legacy system, everything else to one migrated service |
| PRQ-PATH-ROUTING-CONFIG | pass 2 — deep | Multiple concurrent paths, precedence rules, and header rewriting on top of the base split |
| PRQ-GATEWAY-FILTER-AUTHORING | pass 1 — shallow | A minimal custom filter that only inspects a request without modifying it |
| PRQ-GATEWAY-FILTER-AUTHORING | pass 2 — deep | A filter that mutates request/response and correctly composes with the reactive chain |
| DR-DEPLOY | pass 1 — shallow | Gateway deployed to GKE with no filters and a single route |
| DR-DEPLOY | pass 2 — deep | The same deployment carrying auth validation, the token-minting filter, and tracing instrumentation |
