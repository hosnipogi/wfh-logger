## Introduction

Simple Chromium based puppeteer app <span style="font-size: 6px">to automate WFH login and logout</span>. Originally intended to be run in a docker container on a raspberry pi.

---

## Steps

1.  Clone and cd into repository

    `git clone https://github.com/hosnipogi/wfh-logger && cd wfh-logger`

2.  Install package repository

    `npm install`

3.  Create .env file and input creds.

    `cp .env.example .env`

4.  Edit WFH schedule in:

        src/schedule.json

5.  Run typescript.

    `npx tsc`

6.  Create cron job file.

    `cp wfh-cron.example wfh-cron`

7.  Build docker image and start container:

    `docker build --tag $(whoami):wfh . && docker run -dit -v $(pwd):/app --name wfh $(whoami):wfh`

### Run Steps 1-6 in One Line

`git clone https://github.com/hosnipogi/wfh-logger && cd wfh-logger && cp .env.example .env && cp wfh-cron.example wfh-cron`

---

### Updating WFH Sched

Either way will work:

1. Directly edit contents of

    `dist/schedule.json`

2. Edit contents of

    `src/schedule.json`

    then build with

    `docker exec wfh npx tsc`

### Updating Cron Job

`docker exec wfh crontab wfh-cron`

---

### Additional Notes

If you plan to run this without docker, remove options arg from puppeteer's launch method in `src/index.ts`:

    const browser = await puppeteer.launch();
