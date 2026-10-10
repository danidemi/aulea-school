# GOALS

Store SSOT. Scritto da: skill `requirements-gatherer`. Non modificare a mano senza passare dalla skill.

## Enduring Understandings (Backward Design)
Cosa deve restare agli studenti anche dimenticando i dettagli tecnici:

- EU_1: Docker è uno strumento per eseguire un'applicazione insieme alle sue dipendenze in modo isolato e riproducibile — **non è una macchina virtuale**. [stated]
- EU_2: Un sistema reale è quasi sempre composto da più servizi che collaborano (es. applicazione web + database); Docker Compose è lo strumento per comporli ed eseguirli insieme. [stated]
- EU_3: Un'immagine Docker è un artefatto che si può creare, versionare e distribuire, rendendo un'applicazione portabile. [stated]

## Essential Questions
Domande guida che il corso deve far emergere e a cui lo studente deve saper rispondere autonomamente a fine corso:

- EQ_1: Come faccio a far leggere/scrivere a un container un file che sta sul mio computer (fuori dal container)? [stated]
- EQ_2: Come fa un container a inviare una richiesta (es. REST) a un altro container? [stated]
- EQ_3: Cosa vuol dire che la rete Docker è isolata, in pratica? [stated]
- EQ_4: Un container può essere attaccato/compromesso? Cosa significa la sicurezza di un container? [stated] [awaiting: instructional-designer — questa domanda tocca sicurezza; va deciso quanto approfondire vista la scarsa dimestichezza pregressa con rete/porte]

## Knowledge & Skills (obiettivi tracciabili, formato ABCD)

- GOAL_001_LIFECYCLE: Gli studenti sapranno eseguire e gestire il ciclo di vita di un container (avvio, stop, log, esecuzione di comandi al suo interno) usando i comandi Docker standard da riga di comando, tale che riescano a diagnosticare autonomamente lo stato di un container. [stated]
- GOAL_002_IMAGE_BUILD: Gli studenti sapranno costruire un'immagine Docker a partire da un Dockerfile, usando le istruzioni Docker standard, tale che l'immagine costruita esegua correttamente l'applicazione target. [stated]
- GOAL_003_IMAGE_DISTRIBUTE: Gli studenti sapranno distribuire un'immagine Docker (es. verso un registry), usando gli strumenti standard Docker, tale che l'immagine sia recuperabile ed eseguibile da un'altra macchina. [stated]
- GOAL_004_NETWORK: Gli studenti sapranno collegare in rete due o più container (reti Docker, port mapping), usando `docker network` e la mappatura delle porte, tale che un container possa raggiungere un altro container e/o essere raggiunto dall'host. [stated]
- GOAL_005_VOLUME: Gli studenti sapranno rendere persistenti i dati di un container tramite volumi, usando `docker volume` o bind mount, tale che i dati sopravvivano al riavvio del container. [stated]
- GOAL_006_COMPOSE: Gli studenti sapranno comporre ed eseguire un sistema multi-servizio (es. app + database) usando Docker Compose, tale che il sistema descritto in un unico file `docker-compose.yml` si avvii correttamente con un solo comando. [stated]
- GOAL_007_COMPLEX_SYSTEM: Gli studenti sapranno mettere in piedi un sistema complesso multi-servizio (es. app + database + servizio mock, es. SMTP) usando Docker Compose, tale che tutti i servizi comunichino correttamente tra loro secondo la topologia richiesta. [stated]

- GOAL_008_TROUBLESHOOTING: Gli studenti sapranno diagnosticare un malfunzionamento in un sistema basato su container (es. due container che non riescono a collegarsi), usando gli strumenti di ispezione Docker standard (log, inspect, network, exec) e il ragionamento per ipotesi, tale che riescano a formulare almeno un'ipotesi plausibile sulla causa del malfunzionamento e a indicare come verificarla. [stated]

Nota: le competenze su processi (stdin/stdout/tty/pipe/segnali) e su rete (porte, IP) NON sono prerequisiti (vedi LOGISTICS) ma sono contenuto da insegnare nel corso stesso, propedeutico a GOAL_004, GOAL_008 e alle Essential Questions EQ_1–EQ_4. [stated] [awaiting: instructional-designer — sequenziare questi contenuti prima di GOAL_004 e GOAL_008]

## Verifica (come si accerta il raggiungimento dei goal)

- Verifiche intermedie: quiz teorici e distribuiti durante il corso per verificare l'acquisizione dei concetti teorici. [stated]
- Verifica finale: progetto finale di gruppo presentato alla lavagna (oral/demo), con criteri a gradini crescenti di complessità:
  1. Funzionamento minimo, senza persistenza (perde i dati al riavvio, es. senza DB). [stated]
  2. Funzionamento con persistenza (es. DB + volume, i dati sopravvivono al riavvio). [stated]
  3. Funzionamento con servizi aggiuntivi (es. un mock SMTP). [stated]
  4. Funzionamento con più repliche. [stated]
- Prova di manualità: durante l'interrogazione, allo studente viene chiesto di modificare live il proprio progetto, per verificare la reale comprensione (non solo copia di un tutorial). **Questa prova è obbligatoria per superare l'esame** (senza di essa non si passa, indipendentemente dagli altri criteri). [stated]
- Prova di troubleshooting (verifica di GOAL_008): sempre in sede di interrogazione, allo studente viene presentata una situazione teorica di malfunzionamento (es. due container che non si collegano) e deve formulare ipotesi plausibili sulla causa, senza necessariamente riprodurla dal vivo. È una prova aggiuntiva rispetto alla prova di manualità, non sostitutiva. [stated]. **Questa prova è obbligatoria per superare l'esame**
- Voto: i gradini del progetto (1–4) e le prove orali (manualità, troubleshooting) determinano il voto tra 18 e 30, condizionato al superamento della prova di manualità. [stated]
