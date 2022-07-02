// web
const Soup = imports.gi.Soup;

// file system
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// set timeout
const Mainloop = imports.mainloop;
const GObject = imports.gi.GObject;

// version
const Config = imports.misc.config;
const [major, minor] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const CODEFORCES_API_URL = "https://codeforces.com/api/contest.list?gym=false";

var Contests = class Contests {
    constructor(updateCallback) {
        this.cacheFilePath = GLib.build_filenamev([GLib.get_user_cache_dir(), 'ContestCountdown', 'contests.json']);

        this.updateCallback = updateCallback;
        this.retriesLeft = 5;
        this.retryTime = 1;
        this.refreshTimeout = null;
        this.allContests = [];
        this.nextContest = null;
        this.loadFromFile();
        this.refresh();
    }

    stop() {
        GLib.source_remove(this.refreshTimeout);
    }

    loadFromFile() {
        this.allContests = [];
        try {
            const cacheFile = Gio.File.new_for_path(this.cacheFilePath);
            const [, contents, etag] = cacheFile.load_contents(null);

            const contentsString = (major < 40) ?
                (new TextDecoder('utf-8')).decode(contents) :
                imports.byteArray.toString(contents);

            this.updateContests(JSON.parse(contentsString));
            this.setNextContest();

        }
        catch (e) {
            global.log("ContestCountdown: No cache File / Cant open cache");
            global.log(e);
        }
    }

    saveToFile() {
        let cacheFile = Gio.File.new_for_path(this.cacheFilePath);
        if (GLib.mkdir_with_parents(cacheFile.get_parent().get_path(), parseInt("0755", 8)) === 0) {
            let [_success, tag] = cacheFile.replace_contents(JSON.stringify(this.allContests), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            if (!_success)
                global.log("ContestCountdown: Failed to write to cache file");
        } else {
            global.log("ContestCountdown: Failed to create cache folder");
        }
    }

    refresh() {
        this.retriesLeft--;

        let session = new Soup.SessionAsync();
        let message = Soup.Message.new("GET", CODEFORCES_API_URL);

        session.queue_message(message, (session, message) => {
            try {
                let response = JSON.parse(message.response_body.data);
                if (response.status != "OK") throw "Got non OK status";

                this.updateContests(response.result);
                this.updateCallback();

                // if successful after retries, restore these
                this.retriesLeft = 5;
                this.retryTime = 1;
                this.refreshTimeout = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT,
                    6 * 3600,
                    this.refresh
                );
            } catch (e) {
                global.log(
                    "ContestCountdown: Contest refresh failed\n retry left " +
                    this.retriesLeft +
                    "\n" +
                    e
                );

                if (this.retriesLeft) {
                    // if retries are left, then retry with exponentialy increasing time
                    this.retryTime *= 2;
                    this.refreshTimeout = GLib.timeout_add_seconds(
                        GLib.PRIORITY_DEFAULT,
                        this.retryTime,
                        this.refresh
                    );
                } else {
                    // permanent fail, no more try
                    this.retriesLeft = 5;
                    this.retryTime = 1;
                }
            }
        });
        return false;
    }

    updateContests(newContests) {
        newContests = this._filterContest(newContests);

        for (let contest of newContests) {
            if ("participating" in contest) continue;
            contest.participating = true;
            for (let existingContest of this.allContests) {
                if (existingContest.id == contest.id) {
                    contest.participating = existingContest.participating;
                }
            }
        }

        this.allContests = newContests;

        this.setNextContest();
        this.saveToFile();
    }

    _filterContest(contests) {
        contests = contests.filter(
            (contest) =>
                contest.startTimeSeconds &&
                contest.phase == "BEFORE" &&
                this.secondsTillContest(contest) >= 0
        );

        contests.sort((a, b) => {
            return parseInt(a.startTimeSeconds) - parseInt(b.startTimeSeconds);
        });

        return contests;
    }

    secondsTillContest(contest) {
        return Math.floor(
            (new Date(contest.startTimeSeconds * 1000) - new Date()) / 1000
        );
    }

    setNextContest() {
        this.nextContest = null;
        this.allContests = this._filterContest(this.allContests);
        for (let contest of this.allContests)
            if (contest.participating) {
                this.nextContest = contest;
                break;
            }
    }

    secondsTillNextContest() {
        if (this.nextContest) {
            let timeDiff = this.secondsTillContest(this.nextContest);
            if (timeDiff >= 0) return timeDiff;
            else {
                this.setNextContest();
                return this.secondsTillNextContest();
            }
        } else {
            // when no next contest
            // if still trying to load data, return -1
            // if failed to load, return -Infinity
            // if no upcoming contest, return Infinity

            if (this.retriesLeft < 5) return -1;
            if (this.allContests.length == 0) return -Infinity;
            return Infinity;
        }
    }
};
