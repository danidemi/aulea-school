# Everything render_deck.py needs, self-contained: LibreOffice for pptx -> pdf,
# mermaid-cli for diagram -> png, python-pptx/PyYAML for the renderer itself.
# The host only needs Docker; build and run through the `slides` wrapper script.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        libreoffice-impress \
        chromium \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# mermaid-cli drives a headless Chromium via puppeteer. Point it at the
# apt-installed browser instead of letting it download its own.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN npm install -g @mermaid-js/mermaid-cli@10

WORKDIR /opt/slides
COPY requirements.txt mermaid_puppeteer_config.json render_deck.py ./
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

ENTRYPOINT ["python3", "/opt/slides/render_deck.py"]
