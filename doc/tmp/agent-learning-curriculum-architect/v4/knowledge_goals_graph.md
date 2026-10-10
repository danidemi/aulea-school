# DESIGN — Knowledge Goals Graph

*SSOT store — sole writer: learning-curriculum-architect. Others read only.*

Course: **Spring Cloud Gateway for a Strangler-Fig Migration to GKE**

## Persona roster

| Persona id | Persona (STUDENT_PERSONAS) | Cohort count |
|---|---|---|
| P-DEV | "Marco", the Java Developer | 2 |
| P-OPS | "Sara", the Ops Engineer | 2 |

## Baseline nodes

| id | key | description | knowledge_type | held_by | provenance_tags |
|---|---|---|---|---|---|
| BSL-REST | rest | The REST architectural style: resources, HTTP methods, status codes, headers. | declarative | P-DEV, P-OPS | [stated] |
| BSL-DOCKER | docker | Building and running containers with Docker: images, Dockerfiles, basic container lifecycle. | procedural | P-DEV, P-OPS | [stated] |
| BSL-SPRING | spring-boot | Comfortable authoring Spring Boot applications (beans, configuration, REST controllers). | procedural | P-DEV | [stated] |
| BSL-GKE-INFRA | gke-infra | Comfortable operating containerized workloads on GKE: cluster concepts, deploying/managing workloads. | procedural | P-OPS | [stated] |

## DesiredResult nodes

| id | key | description | knowledge_type | audience | skippable_by | persona_variant | provenance_tags |
|---|---|---|---|---|---|---|---|
| DR-DEPLOY | deploy-gateway-gke | Stand up a Spring Cloud Gateway instance and deploy it to a GKE cluster, from a running Spring Boot project through to a live containerized workload reachable inside the cluster. | procedural | all | — | P-DEV: builds and runs the gateway application. P-OPS: containerizes, deploys, and operates it on GKE. | [stated], [inherited_inferred] |
| DR-ROUTE | strangler-fig-routing | Configure path-based route splitting in the gateway so some paths reach newly migrated microservices and others (e.g. `/legacy/**`) reach the still-running legacy system, correctly implementing the strangler-fig traffic split. | procedural | all | — | P-DEV: authors the route/predicate definitions. P-OPS: verifies the split reaches the right backends and tunes route config. | [stated], [inherited_inferred] |
| DR-AUTHN | validate-entra-jwt-cors | Validate an incoming JWT issued by Microsoft Entra ID at the gateway (issuer, signature, audience/claims) and apply a correct CORS policy so browser clients can call the gateway. | procedural | all | — | P-DEV: implements the resource-server/JWT-validation filter and CORS configuration. P-OPS: registers/configures the Entra ID app registration and the environment's allowed-origin values. | [stated], [inherited_inferred] |
| DR-TOKEN | mint-legacy-compatible-token | At the gateway, mint a custom internal token shaped to match what the legacy application already expects, and propagate it to downstream services, so legacy/backend code needs no immediate change during the migration. | procedural | [P-DEV] | — | — | [stated] |
| DR-TRACE | otel-gateway-tracing | Have the gateway participate in or initiate OpenTelemetry distributed tracing, propagating trace context across gateway → microservices → legacy so a request can be followed end to end. | procedural | all | — | P-DEV: adds/verifies span creation and context propagation in gateway code where needed. P-OPS: wires the OpenTelemetry collector/exporter pipeline and confirms traces reach the backend. | [stated], [inherited_inferred] |

## Prerequisite nodes

| id | key | description | knowledge_type | audience | skippable_by | persona_variant | root | root_rationale | provenance_tags |
|---|---|---|---|---|---|---|---|---|---|
| PRQ-STRANGLER-FIG | strangler-fig-pattern | The strangler-fig migration pattern: why traffic is split gradually between legacy and new systems during a live migration, and why the dual-environment window must be kept short. | contextual | all | — | — | true | Opening framing: this is the problem framing that motivates the whole course; it rests on no prior knowledge, so nothing enables it. | [stated] |
| PRQ-SCG-BASICS | scg-basics | What an API/edge gateway is and the Spring Cloud Gateway vocabulary: route, predicate, filter, and how a request flows through them. | declarative | all | — | — | | | [inferred] |
| PRQ-GATEWAY-CONFIG-MODEL | gateway-config-model | How gateway behavior (routes, predicates, filters) is expressed in configuration (e.g. `application.yml`) vs. code, and where CORS/auth/tracing settings attach to that model. | procedural | all | — | P-DEV: authors/edits the configuration. P-OPS: reads and tunes configuration values operationally. | | | [inferred], [inherited_inferred] |
| PRQ-GATEWAY-BOOTSTRAP | gateway-bootstrap | Bootstrapping a Spring Boot project with the Spring Cloud Gateway starter (dependencies, project layout, minimal runnable gateway). | procedural | [P-DEV] | — | — | | | [inferred] |
| PRQ-CONTAINERIZE-SPRING-APP | containerize-spring-app | Containerizing a Spring Boot application for deployment (building a runnable image for a JVM app). | procedural | all | — | P-DEV: understands enough to run/test the image locally. P-OPS: builds and publishes the production image. | | | [inferred], [inherited_inferred] |
| PRQ-K8S-BASICS | k8s-basics | Core Kubernetes objects needed to run a container: Pod, Deployment, Service, Ingress. | declarative | all | [P-OPS] | — | | | [inherited_inferred] |
| PRQ-GKE-DEPLOY | gke-deploy | Deploying a containerized application to a GKE cluster: manifests, `gcloud`/`kubectl` workflow, GKE-specific concerns. | procedural | all | [P-OPS] | — | | | [inherited_inferred] |
| PRQ-PATH-ROUTING | path-based-routing | Defining path-based route predicates in Spring Cloud Gateway (Path predicate, route ordering) to split traffic between legacy and migrated paths. | procedural | all | — | P-DEV: authors the Predicate/Route definitions. P-OPS: verifies/tunes the routing configuration and validates the observed traffic split. | | | [stated], [inherited_inferred] |
| PRQ-OAUTH-OIDC-BASICS | oauth-oidc-basics | Conceptual OAuth2/OIDC token-issuance flow: what an identity provider issues, and why, at the level needed to understand an incoming Entra ID token. | declarative | all | — | — | | | [inherited_inferred] |
| PRQ-JWT-BASICS | jwt-basics | JWT structure and validation concepts: header/claims/signature, issuer and audience checks. | declarative | all | — | — | | | [inherited_inferred] |
| PRQ-ENTRA-JWT-VALIDATION | entra-jwt-validation | Configuring the gateway to validate JWTs issued by Microsoft Entra ID (issuer/JWKS setup, resource-server configuration). | procedural | all | — | P-DEV: implements the JWT-validation filter/resource-server configuration in Spring. P-OPS: registers/configures the Entra ID app registration and supplies issuer/tenant values. | | | [stated], [inherited_inferred] |
| PRQ-CORS-BASICS | cors-basics | CORS concepts: same-origin policy, preflight requests, allowed origins/headers/methods. | declarative | all | — | — | | | [inferred] |
| PRQ-CORS-CONFIG | cors-config | Configuring CORS at the gateway. | procedural | all | — | P-DEV: authors the CORS configuration. P-OPS: verifies/maintains the allowed-origins list per environment. | | | [stated], [inherited_inferred] |
| PRQ-REACTIVE-BASICS | reactive-basics | Reactive programming basics (Mono/Flux, non-blocking chain) needed to write WebFlux-based gateway filters. | declarative | [P-DEV] | — | — | | | [inferred] |
| PRQ-GATEWAY-FILTER-AUTHORING | gateway-filter-authoring | Writing a custom `GlobalFilter`/`GatewayFilter` in Spring Cloud Gateway: the reactive filter chain and mutating the exchange. | procedural | [P-DEV] | — | — | | | [inferred] |
| PRQ-LEGACY-TOKEN-SHAPE | legacy-token-shape | The concrete format/claims the legacy application's existing token expects, so a substitute token can be minted to match it. | declarative | [P-DEV] | — | — | true | Externally-unknown content: GOALS states a downstream token must "emulate the token the legacy application already expects", but its concrete shape/claims are not pinned by the client. It cannot be decomposed until supplied, so it is placed as a root pending that input. | [stated], [risk] |
| PRQ-TOKEN-MINTING | token-minting | Minting a downstream token inside a gateway filter, shaped like the legacy token. | procedural | [P-DEV] | — | — | | | [stated] |
| PRQ-TOKEN-PROPAGATION | token-propagation | Propagating the minted token to downstream services (forwarding it on the outgoing request). | procedural | [P-DEV] | — | — | | | [stated] |
| PRQ-TRACING-CONCEPTS | tracing-concepts | Distributed tracing concepts: trace, span, and trace-context propagation across service boundaries. | declarative | all | — | — | | | [inferred] |
| PRQ-OTEL-GATEWAY-INSTRUMENTATION | otel-gateway-instrumentation | Instrumenting/configuring the gateway to participate in or initiate OpenTelemetry tracing, propagating trace context to downstream microservices and the legacy system. | procedural | all | — | P-DEV: configures/adds spans in gateway code where auto-instrumentation is insufficient. P-OPS: wires the OpenTelemetry collector/exporter pipeline and confirms end-to-end trace delivery. | | | [stated], [inherited_inferred] |

## Edges (Source -Enables-> Target)

| Source | Target | Reason |
|---|---|---|
| BSL-REST | PRQ-SCG-BASICS | A generic idea of request/response and routing (REST) is needed before an API-gateway's route/predicate/filter model makes sense. |
| BSL-SPRING | PRQ-GATEWAY-BOOTSTRAP | Bootstrapping a Spring Boot project with the gateway starter builds directly on existing Spring Boot fluency. |
| PRQ-SCG-BASICS | PRQ-GATEWAY-BOOTSTRAP | Bootstrapping the project requires already knowing what a route/predicate/filter is. |
| PRQ-SCG-BASICS | PRQ-GATEWAY-CONFIG-MODEL | The configuration model expresses the same route/predicate/filter vocabulary, learned first conceptually. |
| BSL-DOCKER | PRQ-CONTAINERIZE-SPRING-APP | Building a Spring Boot image builds on general container/Dockerfile skills. |
| BSL-DOCKER | PRQ-K8S-BASICS | Kubernetes objects (Pod, Deployment) are built on the notion of a running container. |
| PRQ-K8S-BASICS | PRQ-GKE-DEPLOY | Deploying to GKE requires knowing the core Kubernetes objects being deployed. |
| PRQ-CONTAINERIZE-SPRING-APP | PRQ-GKE-DEPLOY | You must have a deployable image before you can deploy it to a cluster. |
| PRQ-GATEWAY-BOOTSTRAP | DR-DEPLOY | A runnable gateway project is a precondition for deploying a gateway instance. |
| PRQ-GKE-DEPLOY | DR-DEPLOY | Deploying to GKE mechanics are directly what DR-DEPLOY exercises. |
| PRQ-STRANGLER-FIG | PRQ-PATH-ROUTING | The routing split only makes sense as an instance of the strangler-fig migration goal. |
| PRQ-GATEWAY-CONFIG-MODEL | PRQ-PATH-ROUTING | Path predicates are expressed inside the gateway's configuration model. |
| PRQ-PATH-ROUTING | DR-ROUTE | DR-ROUTE is the applied, production-shaped version of path-based routing. |
| BSL-REST | PRQ-OAUTH-OIDC-BASICS | OIDC token issuance is carried over HTTP; REST fluency is the substrate. |
| PRQ-OAUTH-OIDC-BASICS | PRQ-JWT-BASICS | JWT is the token format OIDC/OAuth2 issues; the flow context is needed before the token format. |
| PRQ-JWT-BASICS | PRQ-ENTRA-JWT-VALIDATION | Validating an Entra ID JWT requires already knowing JWT structure and validation checks. |
| PRQ-GATEWAY-CONFIG-MODEL | PRQ-ENTRA-JWT-VALIDATION | Resource-server/JWT validation is wired through the gateway's configuration model. |
| PRQ-ENTRA-JWT-VALIDATION | DR-AUTHN | DR-AUTHN is the applied validation of a real Entra ID token. |
| BSL-REST | PRQ-CORS-BASICS | CORS is a browser/HTTP-level policy; REST/HTTP fluency is the substrate. |
| PRQ-CORS-BASICS | PRQ-CORS-CONFIG | Configuring CORS requires already understanding what CORS enforces. |
| PRQ-GATEWAY-CONFIG-MODEL | PRQ-CORS-CONFIG | CORS is configured through the same gateway configuration surface. |
| PRQ-CORS-CONFIG | DR-AUTHN | DR-AUTHN explicitly includes applying CORS at the gateway. |
| BSL-SPRING | PRQ-REACTIVE-BASICS | WebFlux/reactive style builds on existing Spring fluency, extending it to a non-blocking model. |
| PRQ-REACTIVE-BASICS | PRQ-GATEWAY-FILTER-AUTHORING | Custom filters are written against the reactive (WebFlux) chain. |
| PRQ-SCG-BASICS | PRQ-GATEWAY-FILTER-AUTHORING | Authoring a custom filter requires already knowing the filter concept within the gateway model. |
| PRQ-GATEWAY-FILTER-AUTHORING | PRQ-TOKEN-MINTING | The minted token is constructed from inside a custom gateway filter. |
| PRQ-LEGACY-TOKEN-SHAPE | PRQ-TOKEN-MINTING | You must know the target token shape before you can mint an equivalent one. |
| PRQ-JWT-BASICS | PRQ-TOKEN-MINTING | Constructing/signing a token reuses the token-structure concepts learned for validation. |
| PRQ-TOKEN-MINTING | PRQ-TOKEN-PROPAGATION | The token must exist before it can be propagated downstream. |
| PRQ-TOKEN-PROPAGATION | DR-TOKEN | DR-TOKEN is complete only once the minted token is minted and propagated. |
| BSL-REST | PRQ-TRACING-CONCEPTS | Trace-context propagation is carried in HTTP headers; REST/HTTP fluency is the substrate. |
| PRQ-TRACING-CONCEPTS | PRQ-OTEL-GATEWAY-INSTRUMENTATION | Instrumenting the gateway requires already knowing what a trace/span/context is. |
| PRQ-GATEWAY-CONFIG-MODEL | PRQ-OTEL-GATEWAY-INSTRUMENTATION | OpenTelemetry instrumentation is wired through the same gateway configuration surface. |
| PRQ-OTEL-GATEWAY-INSTRUMENTATION | DR-TRACE | DR-TRACE is the applied tracing behavior of the real gateway. |
| BSL-GKE-INFRA | PRQ-K8S-BASICS | Ops's existing GKE/container operating experience already entails the core Kubernetes objects. |
| BSL-GKE-INFRA | PRQ-GKE-DEPLOY | Ops's existing GKE/container operating experience already entails deploying a workload to GKE. |

## Depth staging

| Node | Pass | What changes |
|---|---|---|
| PRQ-SCG-BASICS | pass 1 — shallow | Vocabulary only: what a route/predicate/filter is and why an edge gateway sits in front of the legacy+new systems (paired with `PRQ-STRANGLER-FIG`). |
| PRQ-SCG-BASICS | pass 2 — deep | The filter-chain contract (`GlobalFilter`/`GatewayFilter`, exchange mutation) revisited when reaching `PRQ-GATEWAY-FILTER-AUTHORING` for token minting. |
| PRQ-GATEWAY-CONFIG-MODEL | pass 1 — shallow | Static YAML route/predicate definitions, used for `PRQ-PATH-ROUTING`. |
| PRQ-GATEWAY-CONFIG-MODEL | pass 2 — deep | The same configuration surface reused and extended for JWT validation, CORS, and OpenTelemetry settings. |
| PRQ-JWT-BASICS | pass 1 — shallow | Consuming/validating an incoming JWT (`PRQ-ENTRA-JWT-VALIDATION`, DR-AUTHN). |
| PRQ-JWT-BASICS | pass 2 — deep | Constructing/minting an equivalent token (`PRQ-TOKEN-MINTING`, DR-TOKEN) — moves from consumption to production of the same structure. |
