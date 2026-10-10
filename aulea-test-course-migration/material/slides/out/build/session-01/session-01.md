---
title: '[DRAFT] Sessione 1 — Mettere in piedi il gateway e rendere reale lo split strangler-fig'
subtitle: 'Obiettivi G1, G2 e primo passaggio su G5'
author: 'Spring Cloud Gateway per una migrazione strangler-fig su GKE'
lang: it
---

# Unit 1.1 — Deploy di un gateway minimo su GKE

## Lo stesso gateway è due oggetti diversi secondo il mestiere di chi lo guarda.

![Un solo componente, due letture](material/slides/out/build/session-01/mermaid/S1-U1.1-01.png)

::: notes
**Tempo:** ~6 min

**Da dire:** Una frase per mestiere, dette in quest'ordine e senza approfondire: per chi
sviluppa è un'applicazione Spring Boot containerizzata come le altre; per chi
gestisce è un carico in più su un cluster che già amministra. Serve un
vocabolario condiviso prima del laboratorio, altrimenti le due coppie
useranno la stessa parola per cose diverse per tutto il giorno.

**Perché questa slide sta qui:** Il curriculum assegna dieci minuti di vocabolario condiviso in apertura,
prima di qualunque attività, perché la coorte è mista e nessuno dei due
gruppi conosce Spring Cloud Gateway.

**Collegamenti:** Prepara il compito concreto immediatamente successivo e i due rami di corsia.
Il ramo legacy anticipa l'unità 1.2.

**Attenzione a:** Non trasformarlo in un'introduzione all'architettura: qui non si spiega ancora
nulla del funzionamento, si allinea solo il linguaggio.

**Obiettivi:** G1
:::

## Finché nessuno raggiunge il gateway dall'esterno, la migrazione non è iniziata.

> Il cluster GKE è pronto, l'immagine del gateway esiste. Nessuna richiesta arriva a destinazione.

::: notes
**Tempo:** ~5 min

**Da dire:** Presentare la situazione come un fatto, non come esercizio didattico: è
esattamente il punto in cui si trova il progetto in azienda. Il vincolo del
mese di scadenza rende questo il primo blocco da rimuovere. Non anticipare
quali sono le cause tecniche: la domanda deve restare aperta fino al debriefing.

**Perché questa slide sta qui:** Apre il ciclo esperienziale dell'unità con un problema riconoscibile dalla
coorte, come richiesto dal metodo problem-first del curriculum.

**Collegamenti:** È la ragione per cui l'obiettivo G1 viene prima di tutti gli altri: nulla di
ciò che segue è verificabile su un gateway non raggiungibile.

**Attenzione a:** La coppia ops salta volentieri alla soluzione perché il dominio le è familiare:
raccogliere l'ipotesi e rimandarla al debriefing invece di discuterla adesso.

**Obiettivi:** G1
:::

## Il compito è un pod del gateway raggiungibile entro il time box.

- Immagine del gateway già disponibile
- Cluster GKE vuoto e pronto
- Esito atteso: risposta dall'esterno
- Time box dichiarato e visibile

::: notes
**Tempo:** ~4 min

**Da dire:** Leggere la condizione di successo e far partire il timer, senza suggerire la
strada. Il time box è parte dell'esercizio: serve a produrre un fallimento
parziale su cui lavorare dopo, non a mettere pressione. Ricordare che i
comandi stanno nella dispensa, non sulle slide.

**Perché questa slide sta qui:** Esperienza concreta: il compito precede la spiegazione del modello di deploy.

**Collegamenti:** Gli errori che emergono qui diventano il materiale del debriefing e vengono
ripresi uno per uno nella parte teorica.

**Attenzione a:** Verificare prima di partire che tutti abbiano accesso a gcloud e al cluster:
il curriculum segnala questo controllo come rischio aperto, non confermato dal
cliente. Senza accesso l'unità non ha pista di lancio.

**Obiettivi:** G1
:::

## La corsia sviluppo lavora sull'applicazione e sulla sua immagine.

1. Ispezionare l'applicazione Spring Boot
2. Verificare porta e endpoint di salute
3. Controllare il Dockerfile
4. Consegnare l'immagine alla corsia ops

*corsia SVILUPPO*

::: notes
**Tempo:** ~3 min

**Da dire:** Assegnare i nomi ad alta voce, non lasciare che le coppie si autoassegnino:
con quattro persone si sovrappongono sullo stesso passo. Insistere sul fatto
che l'endpoint di salute non è un dettaglio, perché è il punto su cui si
innesta la parte teorica successiva.

**Perché questa slide sta qui:** Ferma la decomposizione dove il curriculum la ferma per questa coppia: Spring
Boot è già patrimonio dei due sviluppatori e non viene rispiegato.

**Collegamenti:** La consegna dell'immagine è il punto di incontro con la corsia ops e prepara
la riconvergenza.

**Attenzione a:** Rischio noia per chi si muove più veloce: chi finisce presto affianca la
corsia ops sul cluster, non aggiunge funzionalità in autonomia.

**Obiettivi:** G1
:::

## La corsia ops porta l'immagine sul cluster e la rende raggiungibile.

1. Scrivere il Deployment
2. Esporre il Service
3. Impostare la readiness probe
4. Chiamare l'endpoint dall'esterno

*corsia OPS*

::: notes
**Tempo:** ~3 min

**Da dire:** Qui il dominio è loro: non spiegare Kubernetes, chiedere di applicarlo. La sola
cosa nuova è che il carico da esporre è un'applicazione Java, e la differenza
pratica si vede sui tempi di avvio e quindi sulla probe.

**Perché questa slide sta qui:** La decomposizione si ferma su Docker e GKE per questa coppia: sono competenze
già dichiarate e il curriculum vieta di rispiegarle.

**Collegamenti:** Nessun ramo scende fino a leggere o scrivere Java per questa corsia: tutto
resta configurazione e comportamento osservato.

**Attenzione a:** Il tempo di avvio di una JVM è più lungo di quello che questa coppia si aspetta
da un container: è la causa più probabile di una probe che fallisce.

**Obiettivi:** G1
:::

## Nella maggioranza dei casi il blocco è l'esposizione, non l'immagine.

- Cosa si è rotto per primo?
- Come lo avete capito?
- Chi ha visto cosa, da che punto?
- Cosa cambiereste ora?

::: notes
**Tempo:** ~10 min

**Da dire:** Far parlare prima chi ha incontrato l'errore, non chi ha trovato la soluzione,
e raccogliere le cause su una lavagna condivisa senza correggerle subito:
servono intere come materiale per la parte teorica. Chiudere solo dopo che
entrambe le corsie hanno confermato assieme che il gateway risponde.

**Perché questa slide sta qui:** La riflessione è lo stadio che viene saltato più spesso ed è quello che
trasforma l'attività in apprendimento: il curriculum la rende esplicita.

**Collegamenti:** È anche il momento di riconvergenza fra le due corsie previsto dal curriculum,
in cui la coppia ops fa da mentore sul divario specifico di GKE.

**Attenzione a:** Se diventa una gara di soluzioni si perde il valore formativo: riportare le
persone sulle cause e su come le hanno individuate.

**Obiettivi:** G1
:::

## Una richiesta raggiunge il pod solo se Service e probe lo consentono.

![Il percorso completo di una richiesta](material/slides/out/build/session-01/mermaid/S1-U1.1-07.png)

::: notes
**Tempo:** ~10 min

**Da dire:** Percorrere il diagramma nell'ordine in cui viaggia la richiesta e fermarsi sul
ramo negativo della probe: è lì che finiva la maggior parte degli errori
raccolti alla lavagna pochi minuti prima. Collegare ogni nodo a un errore
realmente visto, nominando chi lo ha incontrato: è la differenza fra una
spiegazione e una spiegazione che risponde a qualcosa.

**Perché questa slide sta qui:** Concettualizzazione astratta: arriva dopo l'esperienza e spiega ciò che i
partecipanti hanno già osservato, mai prima.

**Collegamenti:** Chiude gli errori del debriefing; il nodo del pod è il punto in cui si innesta
l'exporter di tracciamento della slide successiva.

**Attenzione a:** Per la corsia sviluppo il ramo "non pronta" è il meno intuitivo: dal loro punto
di vista l'applicazione è partita, ma per il cluster non esiste ancora.

**Obiettivi:** G1
:::

## L'exporter OpenTelemetry di default si abilita senza scrivere codice.

```yaml
management:
  tracing:
    sampling:
      probability: 1.0
otel:
  exporter:
    otlp:
      endpoint: http://collector:4317
```

*Configurazione, non codice: vale per entrambe le corsie*

::: notes
**Tempo:** ~5 min

**Da dire:** Sottolineare che questa è configurazione e non codice, perché è ciò che rende
il tracciamento accessibile anche a chi non scrive Java. Il campionamento a uno
serve solo in aula: in produzione va abbassato, e conviene dirlo subito per non
lasciare in giro un'idea sbagliata.

**Perché questa slide sta qui:** Primo passaggio superficiale dell'obiettivo G5, che il curriculum distribuisce
a spirale su entrambe le sessioni invece di concentrarlo in un blocco unico.

**Collegamenti:** Il passaggio profondo arriva nell'unità 2.3, dove mancherà un salto di
propagazione da ripristinare.

**Attenzione a:** Non aprire qui il discorso sul formato del contesto di traccia: appartiene al
secondo passaggio e qui ruberebbe tempo al laboratorio.

**Obiettivi:** G5a
:::

## Una traccia reale della vostra richiesta compare nel collector.

> **DA FORNIRE:** Schermata del collector o della console di osservabilità del cliente con una singola traccia espansa, che mostri lo span del gateway.

::: notes
**Tempo:** ~6 min

**Da dire:** Chiedere una previsione prima di ridistribuire: cosa cambierà nella risposta e
cosa comparirà nel collector? Poi applicare la modifica di configurazione e
confrontare la previsione con il risultato. È il confronto, non la modifica, a
consolidare il principio appena spiegato.

**Perché questa slide sta qui:** Sperimentazione attiva sullo stesso ambiente a complessità leggermente maggiore,
e prima osservazione diretta di una traccia da parte dei partecipanti.

**Collegamenti:** Diventa l'esperienza concreta di apertura dell'unità 1.2: ora che qualcosa
risponde, si può decidere dove mandare il traffico.

**Attenzione a:** Deve essere la loro richiesta e la loro traccia, non una dimostrazione del
docente: il curriculum lo chiede esplicitamente per l'obiettivo G5.

**Obiettivi:** G1, G5a
:::

# Unit 1.2 — Instradamento strangler-fig basato sul path

## Ora il traffico deve scegliere fra il servizio nuovo e il legacy.

![Lo split che rende reale la strangler fig](material/slides/out/build/session-01/mermaid/S1-U1.2-01.png)

::: notes
**Tempo:** ~5 min

**Da dire:** Riprendere il gateway che risponde dalla fine dell'unità precedente e mostrare
che risponde sempre alla stessa cosa: è inutile finché non discrimina. Questa
è la regola dichiarata dal cliente, non una scelta didattica: lo split avviene
per path.

**Perché questa slide sta qui:** Apre l'unità con il compito successivo, nato dal risultato di quello precedente.

**Collegamenti:** È il secondo passaggio della coppia deploy-instradamento che il curriculum
tratta a spirale invece di imporre una precedenza artificiale.

**Attenzione a:** Qualcuno proporrà di dividere per header o per sottodominio: sono alternative
legittime ma il cliente ha fissato il path, e conviene dirlo apertamente.

**Obiettivi:** G2
:::

## Il compito è mandare /legacy allo stub vecchio e il resto al nuovo.

- Due stub già distribuiti e raggiungibili
- Regola attesa: /legacy/** al legacy
- Ogni altro path al microservizio
- Verifica dall'esterno del cluster

- [Documentazione Spring Cloud Gateway — route, predicate, filter](https://docs.spring.io/spring-cloud-gateway/reference/)

::: notes
**Tempo:** ~4 min

**Da dire:** Chiarire che gli stub esistono già: il laboratorio riguarda solo la regola di
instradamento, non la costruzione dei servizi a valle. La verifica va fatta da
fuori del cluster, perché è l'unico punto di vista che conta per il cliente.

**Perché questa slide sta qui:** Esperienza concreta dell'unità: il compito precede la formalizzazione del
modello di instradamento.

**Collegamenti:** Il risultato viene ripreso nella sessione 2, dove le stesse rotte vanno protette.

**Attenzione a:** Il divario di competenza è massimo qui: senza un ruolo esplicito per la corsia
ops, i due sviluppatori prendono la tastiera e gli altri due guardano.

**Obiettivi:** G2
:::

## La corsia sviluppo scrive predicate e filter dello split.

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: legacy
          uri: http://legacy-stub:8080
          predicates:
            - Path=/legacy/**
```

*Il punto di partenza da completare*

*corsia SVILUPPO*

::: notes
**Tempo:** ~3 min

**Da dire:** Dare il frammento incompleto e chiedere la seconda rotta, invece di mostrare la
soluzione intera. Chiedere ad alta voce cosa accade a un path che non
corrisponde a nessuna regola: la risposta serve al debriefing e quasi nessuno
la indovina.

**Perché questa slide sta qui:** Ferma la decomposizione su Spring Boot, già patrimonio di questa coppia, e
introduce solo ciò che è specifico del gateway.

**Collegamenti:** Il modello formale di route, predicate e filter arriva dopo, non prima.

**Attenzione a:** L'ordine delle rotte conta e non è ovvio: è la causa più frequente di uno split
che sembra funzionare e non funziona.

**Obiettivi:** G2
:::

## La corsia ops verifica lo split dall'esterno e ne certifica il comportamento.

1. Chiamare un path legacy
2. Chiamare un path nuovo
3. Chiamare un path inesistente
4. Riportare le tre risposte osservate

*corsia OPS*

::: notes
**Tempo:** ~3 min

**Da dire:** Questo non è un compito di riserva: è la verifica indipendente dello split, e
la terza chiamata è quella che scopre il caso limite su cui si costruisce il
debriefing. Chiedere di riportare le risposte osservate, non le conclusioni.

**Perché questa slide sta qui:** Dà alla corsia ops un ruolo reale nel blocco più orientato al codice, come
richiesto dal progetto a due corsie del curriculum.

**Collegamenti:** Le tre risposte osservate diventano il materiale della slide di debriefing.

**Attenzione a:** Se questa coppia resta senza compito nella parte di scrittura del codice, perde
il filo per il resto della sessione: assegnare le chiamate per nome.

**Obiettivi:** G2
:::

## I casi limite dello split si vedono solo chiamandolo da fuori.

- Priorità fra rotte sovrapposte
- Slash finale presente o assente
- Path che non corrisponde a nulla
- Chi risponde in caso di dubbio

::: notes
**Tempo:** ~10 min

**Da dire:** Partire dalle tre risposte riportate dalla corsia ops, non dalla
configurazione scritta dagli sviluppatori: il comportamento osservato è il
fatto, la configurazione è solo l'ipotesi. Poi chiedere agli sviluppatori di
raccontare il modello di rotte in parole comprensibili all'altra coppia.

**Perché questa slide sta qui:** Riconvergenza e riflessione previste dal curriculum al termine del laboratorio.

**Collegamenti:** Il caso del path non corrispondente prepara la domanda di apertura della
sessione 2: chi è autorizzato a chiamare queste rotte?

**Attenzione a:** Far raccontare il modello a chi ha scritto la configurazione è il modo più
rapido per scoprire se lo ha capito o solo copiato.

**Obiettivi:** G2
:::

## Rotta, predicato e filtro sono i tre soli pezzi dello split.

![Come il gateway decide e poi trasforma](material/slides/out/build/session-01/mermaid/S1-U1.2-06.png)

::: notes
**Tempo:** ~10 min

**Da dire:** Tre parole e non più di tre: il predicato decide, il filtro trasforma, l'URI
indirizza. Percorrere il ramo negativo fino al 404, perché è il caso limite
appena osservato dalla corsia ops. Il ciclo sulle rotte spiega da solo perché
l'ordine conta.

**Perché questa slide sta qui:** Formalizza il modello dopo che i partecipanti ne hanno visto il comportamento,
e dà il nome alla regola dichiarata dal cliente.

**Collegamenti:** La catena di filtri è il punto in cui la sessione 2 inserirà la validazione del
token e la generazione del token verso il legacy.

**Attenzione a:** La catena di filtri va accennata e non sviluppata: è il gancio della sessione 2
e qui aprirla ruberebbe tempo all'ultima esperienza attiva.

**Obiettivi:** G2
:::

## Una seconda famiglia di path mette alla prova la regola appena capita.

> Estendere l'instradamento a una seconda famiglia di path, decidendo dove collocarla rispetto alle rotte esistenti.

::: notes
**Tempo:** ~6 min

**Da dire:** Chiedere prima dove va messa la nuova rotta e perché, poi farla scrivere: la
decisione sull'ordine è l'apprendimento, la scrittura è meccanica. Chi sbaglia
l'ordine ottiene un errore osservabile, ed è il risultato migliore possibile.

**Perché questa slide sta qui:** Sperimentazione attiva su un problema strutturalmente simile ma nuovo, che
diventa l'esperienza concreta di apertura della sessione successiva.

**Collegamenti:** Confluisce direttamente nel menu opzionale e apre la sessione 2.

**Attenzione a:** Se il tempo stringe, questa è l'ultima cosa da comprimere prima di toccare il
menu opzionale: gli obiettivi G1, G2 e G5a non si tagliano mai.

**Obiettivi:** G2
:::

## Scegliete un approfondimento fra tre, se il tempo lo consente.

- Instradamento a pesi e canary
- Ingress GKE contro Gateway API
- Filtri di riscrittura del path

::: notes
**Tempo:** ~4 min

**Da dire:** Presentare le tre voci e far scegliere alla classe, non scegliere al posto loro:
la voce sui pesi è pensata per chi si annoia, quella su Ingress per la corsia
ops. Se la sessione è in ritardo questo è il primo blocco a cadere, e va detto
senza girarci intorno.

**Perché questa slide sta qui:** Autonomia calibrata: il curriculum prevede un menu stretto e non ampio, per non
lasciare senza percorso definito chi preferisce una traccia strutturata.

**Collegamenti:** È anche la valvola di sfogo temporale dichiarata della sessione.

**Attenzione a:** Se cade, riprenderlo come accenno narrato di cinque minuti invece di eliminarlo
del tutto: resta il segnale che esistono alternative.

**Obiettivi:** G2
:::

## Nella settimana che separa le due sessioni ogni corsia prepara la propria.

- Sviluppo: struttura di un token Entra ID
- Sviluppo: endpoint JWKS, a cosa serve
- Ops: collector ancora raggiungibile

::: notes
**Tempo:** ~4 min

**Da dire:** Dire quanto costa davvero, meno di un'ora, perché il margine di tempo
extra-aula di questa coorte è stretto e un compito che sembra grande non viene
fatto. Spiegare a cosa serve: senza la scorsa sul token, il blocco di
validazione della sessione 2 rischia di sforare.

**Perché questa slide sta qui:** La settimana di intervallo rende praticabile il lavoro fra le sessioni, e il
curriculum lo prevede esplicitamente.

**Collegamenti:** Alimenta direttamente l'unità 2.1 e la verifica del tracciamento dell'unità 2.3.

**Attenzione a:** Il curriculum segnala come rischio aperto che la familiarità con Entra ID sia
più bassa del previsto anche fra gli sviluppatori: questo compito è la
mitigazione, non un extra.

**Obiettivi:** G3, G5b
:::
