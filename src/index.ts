import puppeteer from "puppeteer";
import { Months, Days } from "./enums";
import logger from "./logger";
import path from "path";
import sched from "./schedule.json";
import os from "os";

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

if (!ChatURL || !Email || !Password || !FULLNAME) {
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
    let loginCount = 0;

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

        while (
            (await page.$("input#email[name=email]")) &&
            (await page.$("input#pass[name=pass]"))
        ) {
            if (loginCount === 3) throw new Error("Cannot login");
            loginCount++;
            if (loginCount > 1) {
                logger.error(`Login retries: ${loginCount - 1}`);
                await page.screenshot({
                    path: path.resolve(
                        __dirname +
                            `/../logs/step1-${imgNameFormat}-login_retry_count-${
                                loginCount - 1
                            }.png`
                    ),
                });
            }

            await page.waitForTimeout(4000);
            const emailField = await page.$("input#email[name=email]");
            const passwordField = await page.$("input#pass[name=pass]");
            const submitButton = await page.$("button[name=login]");

            if (!emailField || !passwordField || !submitButton) {
                throw new Error("Cannot find node Email|Pass|Submit");
            }

            await emailField.type(Email, {
                delay: 180,
            });
            await passwordField.type(Password, {
                delay: 180,
            });

            await Promise.all([
                page.waitForNavigation({
                    waitUntil: "domcontentloaded",
                }),
                submitButton.click(),
            ]);

            await page.goto(ChatURL, {
                waitUntil: ["networkidle2", "load"],
                timeout: 65000,
            });
        }

        logger.info(`${Email} logged in.`);

        await page.screenshot({
            path: path.resolve(
                __dirname + `/../logs/step2-${imgNameFormat}-logged_in.png`
            ),
        });

        const chatInputSelector = "div._1p1t";
        logger.info("Trying to open chat..");

        try {
            await page.waitForSelector(chatInputSelector, {
                timeout: 65000,
            });
            logger.info("Selector loaded, loading chat");
        } catch (error) {
            await page.screenshot({
                path: path.resolve(
                    __dirname + `/../logs/step2-${imgNameFormat}-error.png`
                ),
            });
            throw new Error(
                JSON.stringify({
                    msg: "Chat did not load",
                    error,
                })
            );
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
                __dirname + `/../logs/step1-${imgNameFormat}-error.png`
            ),
        });
        await browser.close();
    }
}

main({
    Email,
    Password,
    ChatURL,
});
