FROM python:3.12-alpine

RUN adduser -D -u 10001 sandbox \
    && mkdir -p /work \
    && chown sandbox:sandbox /work \
    && pip install --no-cache-dir pytest

WORKDIR /work
USER sandbox

CMD ["python", "-m", "pytest", "-q"]
