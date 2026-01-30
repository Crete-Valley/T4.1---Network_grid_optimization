FROM soullessblob/cv-dpsim-builder:alpha AS builder
#prep env
ENV DPS_ROOT=/dpsroot
ENV DPS_MODE=local
ENV DPS_LOG_LEVEL=INFO
ENV DPS_DEFAULTS=/dps/defaults.json

RUN mkdir /dps /dpsroot
COPY src /dps
COPY defaults.json /dps
COPY pyproject.toml /dps
WORKDIR /dps
RUN pip install .
CMD ["dps-server"]