FROM node:latest
WORKDIR /app
RUN apt update -y && apt install -y \
chromium \
cron \
&& rm -rf /var/lib/apt/lists/* \
&& apt clean

RUN touch /var/log/cron.log

COPY package.json .
RUN npm install
COPY . .
RUN npx tsc

RUN crontab wfh-cron
CMD cron && date && tail -f /var/log/cron.log