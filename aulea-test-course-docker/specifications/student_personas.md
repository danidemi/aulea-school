# STUDENT_PERSONAS

Store SSOT. Scritto da: skill `requirements-gatherer`. Non modificare a mano senza passare dalla skill.

Le persona qui sotto sono ipotesi di lavoro su come reagiranno gli studenti reali, non dati demografici accertati: vanno trattate come mappe di priorità in competizione, da rivedere se la realtà in aula le contraddice.

---

## Persona 1: "Studente base" (senza background informatico da superiori)

- **Bisogno reale (problem-orientation)** [stated]: vuole essere in grado di eseguire un'applicazione con le sue dipendenze senza dover reinstallare tutto a mano, e vede Docker come strumento utile per un futuro professionale in ambito DevOps.
- **Esperienza pregressa** [stated]: uso base del PC, concetti di sistema operativo scarsi e traballanti. Probabile **ansia da terminale** (la riga di comando non è un ambiente familiare).
- **Autonomia (self-concept)** [stated]: preferisce essere guidato con esempi concreti all'inizio; una volta visto l'esempio, riesce a lavorare da solo se riceve una direttiva chiara. Non è a proprio agio con un approccio completamente aperto/esplorativo fin da subito.
- **Situazione reale (Cross's CAL)** [stated]: farà gli esercizi extra-aula a casa, dopo lezione (non ha altro tempo/luogo dedicato).
- **Gap tecnologico/psicologico** [stated]: poco a suo agio con la tecnologia in generale e con l'inglese tecnico (gran parte della documentazione Docker è in inglese). [inferred] Uno degli obiettivi impliciti del corso è che imparino ad affrontare la documentazione tecnica in inglese, non solo Docker in sé — **da confermare con l'umano se questo va reso un obiettivo esplicito in GOALS**. [awaiting: instructional-designer]
- **Readiness**: il corso è il primo momento in cui questi concetti (processi, reti, porte) vengono affrontati seriamente; niente pre-esposizione. [inferred]

## Persona 2: "Studente esperto" (background informatico da superiori, possibile uso pregresso di Docker)

- **Bisogno reale (problem-orientation)** [stated]: stesso obiettivo di fondo (usare Docker per eseguire applicazioni, prospettiva DevOps), ma parte da una base più solida.
- **Esperienza pregressa** [stated]: potrebbe avere già usato Docker autonomamente; rischio di disallineamento/noia sulle basi già note. [inferred]
- **Autonomia** [inferred]: probabilmente tollera meglio un approccio più aperto rispetto allo Studente base, ma la skill non ha raccolto conferma esplicita — **da verificare in aula**. [awaiting: instructional-designer]
- **Situazione reale**: stessa dello Studente base (esercizi a casa dopo lezione). [inferred, per assenza di informazione differenziata]
- **Gap tecnologico/psicologico** [inferred]: presumibilmente minore ansia da terminale e maggiore dimestichezza con l'inglese tecnico, ma non stated esplicitamente — trattare come ipotesi.

## Decisione di design derivata (da LOGISTICS)
Il corso è tarato sulla Persona 1 (studente base) come baseline; per la Persona 2 vanno previsti margini di approfondimento opzionali, meccanismo concreto non ancora definito. [stated, decisione umana] [awaiting: instructional-designer]
