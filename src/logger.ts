import { format, transports, createLogger } from "winston";
import path from "path";

const logger = createLogger({
    level: "info",
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({
            stack: true,
        }),
        format.splat(),
        // format.json({})
        format.printf((info) =>
            JSON.stringify({
                timestamp: info.timestamp,
                level: info.level,
                message: info.message,
            })
        )
    ),
    defaultMeta: {
        service: "fb-logger",
    },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new transports.File({
            filename: path.resolve(__dirname + "/../logs/error.log"),
            level: "error",
        }),
        new transports.File({
            filename: path.resolve(__dirname + "/../logs/combined.log"),
        }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
    logger.add(
        new transports.Console({
            format: format.simple(),
        })
    );
}

export default logger;
