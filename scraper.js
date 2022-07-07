const { main } = imports.ui;
// web
const Soup = imports.gi.Soup;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { log } = Self.imports.logging;

var Contest = class Contest {
    constructor(id, name, platform, date, duration, participating = null, notified = false) {
        this.id = id;
        this.name = name;
        this.platform = platform;
        this.date = date;
        this.duration = duration;
        this.participating = participating;
        this.notified = notified;
        this.onChange = () => { }; // will be set by the managing Contests object
    }
    secondsTill(notifyBefore = - 1) {
        let res = Math.floor((this.date - new Date()) / 1000);
        if (!this.notified && res <= notifyBefore) {
            main.notify("Contest Countdown", this.name);
            this.notified = true;
            this.onChange();
        }
        return res;
    }
}

let codeforces = function(session) {
    const CODEFORCES_API_URL = "https://codeforces.com/api/contest.list?gym=false";
    return new Promise((resolve, reject) => {
        let message = Soup.Message.new("GET", CODEFORCES_API_URL);
        session.queue_message(message, (_, message) => {

            let response = JSON.parse(message.response_body.data);
            if (!response || response.status != "OK") {
                reject();
                return;
            }

            let result = [];
            for (let entry of response.result)
                if (entry.phase == "BEFORE")
                    result.push(new Contest(
                        entry.id,
                        entry.name,
                        "CodeForces",
                        new Date(entry.startTimeSeconds * 1000),
                        duration = entry.durationSeconds)
                    );

            log.info("codeforces.com download succesful");
            // log.info("codeforces processed response", JSON.stringify(result, null, 2)); 
            resolve(result);
        }
        )
    }).catch((e) => {
        log.error("Failed to get codeforces contests", e);
        reject();
    })
}

const allScrapers = [codeforces];

var DownloadContests = () => {
    let session = new Soup.SessionAsync();
    return Promise.allSettled(allScrapers.map(p => p(session))).then((results) => {
        let value = [], status = true;
        for (let result of results) {
            if (result.status == "fulfilled") // append contest from each scraper
                value.push(...result.value);
            else
                status = false;
        }
        // log.info("DownloadContests completed");
        return { value, status };
    }).catch(e => log.error("DownloadContests", e));
}


