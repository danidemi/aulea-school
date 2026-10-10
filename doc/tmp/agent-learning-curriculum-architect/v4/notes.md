in v4 the Depth staging is still represented as a concept outside the model. this will make it hard to represent it in other ways

## Depth staging

| Node | Pass | What changes |
|---|---|---|
| PRQ-SCG-BASICS | pass 1 — shallow | Vocabulary only: what a route/predicate/filter is and why an edge gateway sits in front of the legacy+new systems (paired with `PRQ-STRANGLER-FIG`). |
| PRQ-SCG-BASICS | pass 2 — deep | The filter-chain contract (`GlobalFilter`/`GatewayFilter`, exchange mutation) revisited when reaching `PRQ-GATEWAY-FILTER-AUTHORING` for token minting. |
| PRQ-GATEWAY-CONFIG-MODEL | pass 1 — shallow | Static YAML route/predicate definitions, used for `PRQ-PATH-ROUTING`. |
| PRQ-GATEWAY-CONFIG-MODEL | pass 2 — deep | The same configuration surface reused and extended for JWT validation, CORS, and OpenTelemetry settings. |
| PRQ-JWT-BASICS | pass 1 — shallow | Consuming/validating an incoming JWT (`PRQ-ENTRA-JWT-VALIDATION`, DR-AUTHN). |
| PRQ-JWT-BASICS | pass 2 — deep | Constructing/minting an equivalent token (`PRQ-TOKEN-MINTING`, DR-TOKEN) — moves from consumption to production of the same structure. |