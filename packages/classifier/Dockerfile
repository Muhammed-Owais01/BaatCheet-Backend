FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Copy dependency files first (better caching)
COPY pyproject.toml .

# Install dependencies using uv (--system flag installs globally)
RUN uv pip install --system --no-cache .

# Copy application code and models
COPY app.py .
COPY models/ ./models/

EXPOSE 8000

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:8000/docs || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
