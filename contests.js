// web 
const Soup = imports.gi.Soup;

// file system
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// set timeout
const Mainloop = imports.mainloop;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const CODEFORCES_API_URL = "https://codeforces.com/api/contest.list?gym=false"

var Contests = class {

        constructor() {

                // https://github.com/ifl0w/RandomWallpaperGnome3/blob/develop/randomwallpaper%40iflow.space/wallpaperController.js
                let xdg_cache_home = GLib.getenv('XDG_CACHE_HOME')
                if (!xdg_cache_home) xdg_cache_home = `${GLib.getenv('HOME')}/.cache`
                this.cacheLocation = `${xdg_cache_home}/${Self.metadata['uuid']}/`;
                this.cacheFile = this.cacheLocation + "contest.json";

                this.retriesLeft = 5;
                this.retryTime = 1;
                this.refreshTimeout = null;
                this.allContests = [];
                this.nextContest = null;
                this.loadFromFile();
                this.refresh();
        }

        loadFromFile() {
                this.allContests = [];
                try {
                        let originalData = GLib.file_get_contents(this.cacheFile);
                        if (originalData[0])
                                this.allContests = JSON.parse(originalData[1]);
                        this.setNextContest();
                } catch (e) {
                        global.log("ContestCountdown: cant open cache " + e)
                }
        }

        saveToFile() {
                GLib.mkdir_with_parents(this.cacheLocation, parseInt('0755', 8));
                let file = Gio.file_new_for_path(this.cacheFile);
                let fstream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                fstream.write(JSON.stringify(this.allContests), null);
                fstream.close(null);
        }

        refresh() {
                this.retriesLeft--;

                // remove refreshTimeout used when refresh fails
                if (this.refreshTimeout) {
                        Mainloop.source_remove(this.refreshTimeout);
                        this.refreshTimeout = null;
                }

                let session = new Soup.SessionAsync();
                let message = Soup.Message.new('GET', CODEFORCES_API_URL);

                session.queue_message(message, (session, message) => {
                        try {
                                let response = JSON.parse(message.response_body.data);
                                if (response.status != "OK")
                                        throw "Got non OK status";


                                this.updateContests(response.result);

                                // if successful after retries, restore these
                                this.retriesLeft = 5;
                                this.retryTime = 1;
                                this.refreshTimeout = Mainloop.timeout_add_seconds(
                                        6 * 3600,
                                        Lang.bind(this, this.refresh)
                                );

                        } catch (e) {
                                global.log("ContestCountdown: Contest refresh failed\n retry left " + this
                                        .retriesLeft +
                                        "\n" + e);


                                if (this.retriesLeft) {
                                        // if retries are left, then retry with exponentialy increasing time
                                        this.retryTime *= 2;
                                        this.refreshTimeout = Mainloop.timeout_add_seconds(
                                                this.retryTime,
                                                Lang.bind(this, this.refresh)
                                        );
                                } else {
                                        // permanent fail, no more try
                                        this.retriesLeft = 5;
                                        this.retryTime = 1;
                                }

                        }


                })
        };

        updateContests(newContests) {

                newContests = newContests.filter((contest) => contest.startTimeSeconds && contest.phase == "BEFORE");

                newContests.sort((contest) => contest.startTimeSeconds);

                let n = 0;
                let o = 0;
                let updatedContests = [];

                while (n < newContests.length && o < this.allContests.length) {
                        if (newContests[n].id === this.allContests[o].id) {
                                updatedContests.push(this.allContests[o]);
                                n++, o++;
                        } else {
                                newContests[n].participating = true;
                                updatedContests.push(newContests[n]);
                                n++;
                        }
                }

                while (n < newContests.length) {
                        newContests[n].participating = true;
                        updatedContests.push(newContests[n]);
                        n++;
                }

                while (o < this.allContests.length) {
                        updatedContests.push(this.allContests[o]);
                        o++;
                }
                this.allContests = updatedContests;


                this.setNextContest();
                this.saveToFile();
        }

        secondsTillContest(contest) {
                return Math.floor((new Date(contest.startTimeSeconds * 1000) - new Date()) / 1000);
        }

        setNextContest() {
                this.nextContest = null;
                this.allContests = this.allContests.filter((contest) => this.secondsTillContest(contest) > 0);
                for (let contest of this.allContests)
                        if (contest.participating) {
                                this.nextContest = contest;
                                break;
                        }
        }

        secondsTillNextContest() {
                if (this.nextContest) {
                        let timeDiff = this.secondsTillContest(this.nextContest);
                        if (timeDiff > 0)
                                return timeDiff;
                        else {
                                this.setNextContest();
                                return this.secondsTillNextContest();
                        }
                } else {
                        // when no next contest
                        // if still trying to load data, return -1
                        // if no upcoming contest, return Infinity
                        // if failed to load, return -Infinity

                        if (this.retriesLeft < 5)
                                return -1;
                        if (this.allContests.length == 0)
                                return -Infinity;
                        return Infinity;
                }

        };
}
