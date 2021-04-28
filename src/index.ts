import puppeteer from "puppeteer";
import { Months, Days } from "./enums";
import logger from "./logger";
import path from "path";
import sched from "./schedule.json";
import os from "os";
import authenticate from "./authenticate";
import axios from "axios";

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
});

interface Options {
    Email: string;
    Password: string;
    ChatURL: string;
}

logger.info("---------------** WFH App started **---------------");
const months = Object.keys(Months);
const days = Object.keys(Days);

const d = new Date();
const month = d.getMonth();
const date = d.getDate();
const day = d.getDay();
const hour = d.getHours();
const imgNameFormat = `${
    months[month]
}-${date}-${d.toLocaleTimeString().replace(/\:/g, "-").replace(/\s/g, "-")}`;
const ChatURL = process.env.FACEBOOK_CHAT_URL;
const Email = process.env.FACEBOOK_EMAIL;
const Password = process.env.FACEBOOK_PASSWORD;
const FULLNAME = process.env.FACEBOOK_FULLNAME;
const GROUPCHATNAME = process.env.GROUPCHAT_NAME;

// 3rd Party Push Notifications -------------------------- //

const PUSHOVER_URL = process.env.PUSHOVER_URL;
const PUSHOVER_TOKEN = process.env.PUSHOVER_TOKEN;
const PUSHOVER_USER = process.env.PUSHOVER_USER;

// -------------------------------------------------------//

if (!ChatURL || !Email || !Password || !FULLNAME || !GROUPCHATNAME) {
    logger.error("Please check ENV");
    process.exit(1);
}

const MONTH_ABBREV = Months[months[month] as "February"];
const DAYS_ABBREV = Days[days[day] as "Sunday"];

if (!sched[MONTH_ABBREV]) {
    logger.info(`No WFH schedule for the month of ${MONTH_ABBREV}`);
    process.exit();
}

if (!sched[MONTH_ABBREV].includes(date)) {
    logger.info(`No WFH schedule today (${MONTH_ABBREV} ${date})`);
    process.exit();
}

const MESSAGE_DATE = `${MONTH_ABBREV} ${date} ${DAYS_ABBREV}`;
const MESSAGE_FULLNAME = FULLNAME.toUpperCase();
const MESSAGE_TEMP = `TIME ${
    hour === 7 ? `IN 36.${Math.floor(Math.random() * 10)}` : "OUT"
}`;

// check if running on a raspberry pi (arm)

const browserOptions =
    os.arch() === "x64"
        ? {}
        : {
              executablePath: "/usr/bin/chromium",
              args: ["--no-sandbox"],
              // headless: false,
          };

async function main(options: Options) {
    const { Email, Password, ChatURL } = options;

    const browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();

    try {
        page.setViewport({
            width: 1280,
            height: 720,
        });

        await page.goto("https://messenger.com", {
            waitUntil: ["load", "networkidle2"],
            timeout: 65000,
        });

        await authenticate({
            page,
            logger,
            Email,
            Password,
            imgNameFormat,
        });

        logger.info(`${Email} logged in.`);

        const chatInputSelector = "div._1p1t";
        const groupChatSelector =
            "div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.pfnyh3mw.d2edcug0.bp9cbjyn.hv4rvrfc.dati1w0a.jb3vyjys.ihqw7lf3";
        logger.info("Trying to open chat..");

        try {
            await page.goto(ChatURL, {
                waitUntil: ["networkidle2", "load"],
                timeout: 65000,
            });
            await page.waitForSelector(groupChatSelector, {
                timeout: 65000,
            });

            const wrongGroupChatCheck = await page.$eval(
                groupChatSelector,
                (node, name) => {
                    // must return since throwing will throw in the puppeteer instance console and not the main process
                    const title = (node as HTMLElement).innerText;
                    return !title ||
                        title === "Facebook User" ||
                        !new RegExp(name as string).test(title)
                        ? 1
                        : 0;
                },
                GROUPCHATNAME!
            );

            if (wrongGroupChatCheck) throw "Wrong group chat";

            await page.waitForSelector(chatInputSelector, {
                timeout: 65000,
            });
            logger.info("Selector loaded, loading chat");
        } catch (error) {
            await page.screenshot({
                path: path.resolve(
                    __dirname +
                        `/../logs/step2-${imgNameFormat}-error-${error}.png`
                ),
            });
            throw new Error(`Chat did not load due: ${error}`);
        }

        const chatInput = await page.$(chatInputSelector);
        if (!chatInput) {
            await page.screenshot({
                path: path.resolve(
                    __dirname + `/../logs/step3-${imgNameFormat}-error.png`
                ),
            });
            throw Error("cannot find node div._1p1t");
        }

        await chatInput.type(MESSAGE_DATE, {
            delay: 180,
        });
        await page.keyboard.down("Shift");
        await page.keyboard.press("Enter");
        await page.keyboard.up("Shift");

        await chatInput.type(MESSAGE_FULLNAME, {
            delay: 180,
        });
        await page.keyboard.down("Shift");
        await page.keyboard.press("Enter");
        await page.keyboard.up("Shift");

        await chatInput.type(MESSAGE_TEMP, {
            delay: 180,
        });
        await page.keyboard.press("Enter");

        logger.info("Message sent.");
        await page.screenshot({
            path: path.resolve(
                __dirname + `/../logs/step3-${imgNameFormat}-success.png`
            ),
        });

        await page.waitForTimeout(4000);
        await browser.close();
    } catch (e) {
        logger.error(e);
        await page.screenshot({
            path: path.resolve(
                __dirname + `/../logs/final-${imgNameFormat}-error.png`
            ),
        });

        if (PUSHOVER_URL && PUSHOVER_TOKEN && PUSHOVER_USER) {
            await axios.post(PUSHOVER_URL, {
                token: PUSHOVER_TOKEN,
                user: PUSHOVER_USER,
                message: JSON.stringify({
                    app: e.service,
                    timestamp: e.timestamp,
                    message: e.message,
                }),
                title: "Davao APP AWA BOT",
            });
        }
        await browser.close();
    }
}

main({
    Email,
    Password,
    ChatURL,
});
