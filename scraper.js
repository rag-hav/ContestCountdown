const { main } = imports.ui;
// web
const Soup = imports.gi.Soup;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { log } = Self.imports.logging;

var Contest = class Contest {
    constructor(url, name, platform, date, duration, participating = null, notified = false) {
        this.url = url;
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
        else if (res <= 0)
            this.onChange();
        return res;
    }
}

// No longer in use
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
                        "https://codeforces.com/contestRegistration/" + contest.id,
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

let kontests = function(session) {
    const KONTESTS_API_URL = "https://kontests.net/api/v1/all";
    return new Promise((resolve, reject) => {
        let message = Soup.Message.new("GET", KONTESTS_API_URL);
        session.queue_message(message, (_, message) => {

            let response = JSON.parse(message.response_body.data);
            if (!response) {
                reject();
                return;
            }

            let result = [];
            for (let entry of response)
                if (entry.status == "BEFORE")
                    result.push(new Contest(
                        entry.url,
                        entry.name,
                        entry.site,
                        new Date(entry.start_time),
                        duration = entry.duration)
                    );

            log.info("kontests.net download succesful");
            // log.info("codeforces processed response", JSON.stringify(result, null, 2)); 
            resolve(result);
        }
        )
    }).catch((e) => {
        log.error("Failed to get kontests.net contests", e);
        reject();
    })

}

const allScrapers = [kontests];

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


