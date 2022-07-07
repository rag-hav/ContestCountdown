const LOG_LEVEL = 0;
const PREFIX = "Contest Countdown";
const LEVELS = ["ERROR", "WARN", "INFO"]

function logger(requiredLevel) {
    if (LOG_LEVEL >= requiredLevel) {
        let prefix = `${PREFIX} [${LEVELS[requiredLevel]}]`
        return (...msgs) => {
            global.log(prefix, ...msgs);
        };
    }
    else
        return () => { };
}

var log = class {
    static error = logger(0);
    static warn = logger(1);
    static info = logger(2);
}

