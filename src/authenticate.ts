import { Page } from "puppeteer";
import { Logger } from "winston";
import path from "path";

type options = {
    page: Page;
    logger: Logger;
    Email: string;
    Password: string;
    imgNameFormat: string;
};

const authenticate = async ({
    page,
    logger,
    Email,
    Password,
    imgNameFormat,
}: options) => {
    let loginCount = 0;
    while (
        (await page.$("input#email[name=email]")) &&
        (await page.$("input#pass[name=pass]"))
    ) {
        if (loginCount === 3) throw new Error("Cannot login, check password");
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
    }
};

export default authenticate;
