FROM agent0ai/agent-zero-base:latest

ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    gh \
    curl \
    jq \
    procps \
    less \
    vim \
    build-essential \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /a0

CMD ["sleep", "infinity"]
