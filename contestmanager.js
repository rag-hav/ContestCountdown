const { Gio, GLib, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const { Contest } = Self.imports.contest;
const { getClist, getCodeforces } = Self.imports.scraper;

export var ContestManager = GObject.registerClass(
    {
        Signals: {
            'update-contests': {},
            'update-next-contest': {},
        }
    },

    class Contests extends GObject.Object {
        _init(settings) {
            super._init();
            let cacheFilePath = GLib.build_filenamev([GLib.get_user_cache_dir(), 'ContestCountdown', 'contests.json']);
            this.cacheFile = Gio.File.new_for_path(cacheFilePath);
            this.settings = settings;

            this.allContests = [];

            // index of next contest (whose countdown is shown)
            // -1 loading
            // -2 No upcoming contest
            // -3 failed to load
            this.nextContest = -1;


            // this.emit('update-contests');

            console.debug("reading cache");
            try {
                let [, contents] = this.cacheFile.load_contents(null);
                let contentsString = "[]";
                if (contents)
                    contentsString = (new TextDecoder('utf-8')).decode(contents);

                this.updateContests(JSON.parse(contentsString).map(
                    c => new Contest(c.url, c.name, c.website, new Date(c.date), c.duration)
                ));
            }
            catch (e) {
                console.warn("No cache File / Cant open cache", e);
            }
            this.regularRefresh();
            this.regularTimerId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                3600, // refresh 1 hour later
                this.regularRefresh.bind(this)
            );

            this.settings.connect('changed::refresh-signal', this.refresh.bind(this));
        }

        setNextContest(val) {
            console.debug("update next contest");
            this.nextContest = val;
            this.emit('update-next-contest');
        }


        // updates the this.nextContest field and saves allContests to cache file
        // is called after clicking on checkbox and after refreshing contests.
        updateCache() {
            console.debug("updateCache");

            if (!GLib.mkdir_with_parents(this.cacheFile.get_parent().get_path(), parseInt("0755", 8)) === 0) {
                console.error("Failed to create cache folder");
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
                        console.error("Failed to write to cache file", e);
                    }
                }
            );

        }

        refresh() {
            let result = this.settings.get_boolean("enable-clist") ? getClist(
                this.settings.get_string("clist-username"),
                this.settings.get_string("clist-token"),
                this.settings.get_boolean("use-whitelisted-websites-only"),
                this.settings.get_string("clist-websites-whitelist"),
                this.settings.get_string("clist-websites-blacklist"),
            ) : getCodeforces();
            this.updateContests(result);
        }

        failiureRefresh() {
            console.debug("retrying refreshing...");

            try {
                this.refresh();

                // returning false will remove this from event loop
                this.failiureRefreshTimerId = 0;
                return false;
            }
            catch (e) {
                console.error("refresh failed", e);
            }

            return true;
        }

        regularRefresh() {
            console.debug("refreshing...");

            try {
                this.refresh();
            }
            catch (e) {
                console.error("refresh failed", e);
                if (!this.failiureRefreshTimerId) {
                    this.failiureRefreshTimerId = GLib.timeout_add_seconds(
                        GLib.PRIORITY_DEFAULT,
                        30,
                        this.failiureRefresh.bind(this)
                    );
                }
            }

            return true;
        }

        destroy() {
            if (this.regularTimerId)
                GLib.source_remove(this.regularTimerId);
            if (this.failiureRefreshTimerId)
                GLib.source_remove(this.failiureRefreshTimerId);
            // super.destroy();
        }

        updateContests(newContests) {
            console.debug("updateContests");

            let oldContests = {};
            for (let contest of this.allContests)
                oldContests[contest.url] = contest;

            for (let contest of newContests) {
                contest.onChange = this.onChange.bind(this);

                // if the contest does not have participating defined
                // then try to get the value of participating from oldContests
                if (contest.participating == null) {
                    let old = oldContests[contest.url];
                    contest.participating = (old ? old.contest.participating : true);
                }
            }


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

