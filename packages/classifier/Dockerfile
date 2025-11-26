# ============================================================
# Stage 0: Build TensorFlow base image (heavy step, cached!)
# ============================================================
FROM python:3.12-slim AS tf_builder

WORKDIR /tf

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin:$PATH"

# Create a minimal pyproject only for TensorFlow
COPY pyproject.toml ./pyproject-tf.toml
RUN sed -i "s/\"fastapi\",//" pyproject-tf.toml \
    && sed -i "s/\"uvicorn\",//" pyproject-tf.toml \
    && sed -i "s/\"pydantic\",//" pyproject-tf.toml \
    && sed -i "s/\"joblib\",//" pyproject-tf.toml \
    && sed -i "s/\"contractions\",//" pyproject-tf.toml

# Install ONLY TensorFlow dependencies (cached forever)
RUN uv pip compile pyproject-tf.toml -o tf-requirements.txt \
    && uv pip install --system --no-cache-dir -r tf-requirements.txt

# Export TensorFlow layer
FROM python:3.12-slim AS tf_base

COPY --from=tf_builder /usr/local/lib/python3.12/site-packages \
                       /usr/local/lib/python3.12/site-packages
COPY --from=tf_builder /root/.local /root/.local
ENV PATH="/root/.local/bin:$PATH"


# ============================================================
# Stage 1: Build dependencies
# ============================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Install curl for uv installer
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Install uv
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin:$PATH"

COPY pyproject.toml .
RUN uv pip install --system --no-cache .

# Cleanup
RUN find /usr/local/lib/python3.12/site-packages -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find /usr/local/lib/python3.12/site-packages -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# ===============================
# Stage 2: Runtime
# ===============================
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

COPY app.py .
COPY models/ ./models/

EXPOSE 8000

# Python-based healthcheck (no curl needed!)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]