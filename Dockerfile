FROM soullessblob/cv-dpsim-builder:alpha AS builder
#prep env
ENV DPS_ROOT=/dpsroot
ENV DPS_LOG_LEVEL=INFO

RUN mkdir /dps /dpsroot
COPY src /dps
COPY pyproject.toml /dps
WORKDIR /dps
RUN pip install .
CMD ["dps-server"]