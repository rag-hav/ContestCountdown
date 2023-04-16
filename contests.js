const { Gio, GLib, GObject } = imports.gi;

// version
const Config = imports.misc.config;
const [major, minor] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const { Contest, DownloadContests } = Self.imports.scraper;
const { log } = Self.imports.logging;

var Contests = GObject.registerClass(
    {
        Signals: {
            'update-contests': {},
            'update-next-contest': {},
        }
    },

    class Contests extends GObject.Object {
        _init() {
            super._init();
            let cacheFilePath = GLib.build_filenamev([GLib.get_user_cache_dir(), 'ContestCountdown', 'contests.json']);
            this.cacheFile = Gio.File.new_for_path(cacheFilePath);

            this.allContests = [];

            // index of next contest (whose countdown is shown)
            // -1 loading
            // -2 No upcoming contest
            // -3 failed to load
            this.nextContest = -1;

            this.timeBetween = 1;
            this.triesLeft = 5;
            this.timerId = null;

            // this.emit('update-contests');

            this.loadCache()
                .then(this.refresh())
                .catch(e => {
                    logError("Contest Countdown", e);
                });
        }

        async loadCache() {
            log.info("reading cache");
            try {
                return new Promise((resolve, reject) => {
                    this.cacheFile.load_contents_async(
                        null,
                        (_, result) => {
                            let [, contents, __1] = this.cacheFile.load_contents_finish(result);
                            let contentsString = "[]";
                            if (contents)
                                contentsString = (major >= 40) ?
                                    (new TextDecoder('utf-8')).decode(contents) :
                                    imports.byteArray.toString(contents);

                            this.updateContests(JSON.parse(contentsString).map(
                                c => new Contest(c.url, c.name, c.platform, new Date(c.date), c.duration)
                            ));
                            resolve();
                        }
                    );
                });
            } catch (e) {
                log.error("No cache File / Cant open cache", e);
            }
        }

        setNextContest(val) {
            log.info("update next contest");
            this.nextContest = val;
            this.emit('update-next-contest');
        }


        // updates the this.nextContest field and saves allContests to cache file
        // is called after clicking on checkbox and after refreshing contests.
        updateCache() {
            log.info("updateCache");

            if (!GLib.mkdir_with_parents(this.cacheFile.get_parent().get_path(), parseInt("0755", 8)) === 0) {
                log.error("Failed to create cache folder");
                resolve();
            }

            this.cacheFile.replace_contents_bytes_async(
                new GLib.Bytes(JSON.stringify(this.allContests)),
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null,
                (_, result) => {
                    try {
                        this.cacheFile.replace_contents_finish(result);
                    } catch (e) {
                        log.error("Failed to write to cache file", e);
                    }
                }
            );

        }

        async refresh() {
            log.info("refreshing...");

            try {
                let result = await DownloadContests();

                if (this.timerId)
                    GLib.source_remove(this.timerId);
                this.timerId = null;

                if (result.status) {
                    this.updateContests(result.value, !result.status);

                    // restore these back to default
                    this.timeBetween = 1;
                    this.triesLeft = 5;
                    this.timerId = GLib.timeout_add_seconds(
                        GLib.PRIORITY_DEFAULT,
                        2 * 3600, // refresh 2 hours later
                        this.refresh.bind(this)
                    );
                } else { // refresh failed
                    this.timeBetween *= 2;
                    this.triesLeft -= 1;

                    if (this.triesLeft > 0) {
                        this.timerId = GLib.timeout_add_seconds(
                            GLib.PRIORITY_DEFAULT,
                            this.timeBetween,
                            this.refresh.bind(this)
                        );
                    }
                }

                return false; // not persistent timeout
            }
            catch (e) {
                log.error("refresh failed", e);
            }
        }

        destroy() {
            if (this.timerId)
                GLib.source_remove(this.timerId);
            // super.destroy();
        }

        updateContests(newContests, keep = true) {
            log.info("updateContests");

            let oldContests = {};
            for (let contest of this.allContests)
                oldContests[contest.url] = { contest, keep };

            // if the contest does not have participating defined
            // then get the value of participating from this.allContests 
            for (let contest of newContests) {
                contest.onChange = this.onChange.bind(this);
                let old = oldContests[contest.url];
                if (old)
                    old.keep = false;
                if (contest.participating == null)
                    contest.participating = (old ? old.contest.participating : true);
            }

            if (keep)
                newContests.push(...this.allContests.filter(c => oldContests[c.url].keep));

            this.allContests = newContests;
            this.onChange();
        }

        onChange() {
            let curDate = new Date();

            this.allContests = this.allContests.filter(c => c.date > curDate);
            this.allContests.sort((a, b) => a.date > b.date);

            let newNext = this.allContests.findIndex((c) => c.participating);
            if (newNext >= 0)
                this.setNextContest(newNext);
            else if (this.retriesLeft)
                this.setNextContest(-1); // loading
            else if (this.allContests.length)
                this.setNextContest(-2); // no upcoming
            else
                this.setNextContest(-3); // failed to load

            this.updateCache();
            this.emit('update-contests');
        }
    });

