# Agent Zero Docker Development Setup

## Quick Start

### Build the Dev Image
```bash
cd docker/run
docker build -f ../../DockerfileLocal -t agent-zero:dev ../..
```

### Run with Docker Compose

**For development (uses local code mount):**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**For production-like (uses latest image):**
```bash
docker compose up -d
```

## LLM Service Configuration

The container is configured to reach LLM services on your host machine via `host.docker.internal`.

### Default LLM Ports
| Service | Port | Environment Variable |
|---------|------|---------------------|
| Ollama | 11434 | `OLLAMA_HOST` |
| LLM Service 1 | 8787 | `A0_LLM_PORT_8787` |
| LLM Service 2 | 4521 | `A0_LLM_PORT_4521` |
| LLM Service 3 | 4523 | `A0_LLM_PORT_4523` |

### Configuring LLM Endpoints

To use local LLM services, you need to set the `api_base` in `model_providers.yaml`:

```yaml
chat:
  ollama:
    name: Ollama
    litellm_provider: ollama
    kwargs:
      api_base: http://host.docker.internal:11434
```

**Important:** Copy your config to the mounted `agent-zero/conf` directory so it persists:

```bash
cp ../../conf/model_providers.yaml ./agent-zero/conf/
```

Then edit `./agent-zero/conf/model_providers.yaml` to add the `api_base` for your local LLM services.

## Volume Mounts

| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `./agent-zero/usr` | `/a0/usr` | User plugins, settings |
| `./agent-zero/conf` | `/a0/conf` | Configuration files |
| `./agent-zero/code` | `/a0/code` | Live code (dev only) |

## Accessing the UI

- **Local:** http://localhost:50080
- **Remote:** http://<host-ip>:50080

## Troubleshooting

### Container can't reach host services
Ensure `extra_hosts` is configured in docker-compose.yml:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Using different LLM ports
Edit the environment variables in docker-compose.yml to match your setup.
