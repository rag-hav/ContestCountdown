const { main, popupMenu, checkBox, panelMenu } = imports.ui;
const { GLib, St, GObject, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { Contests } = Self.imports.contests;
const { Contest } = Self.imports.scraper;
const { log } = Self.imports.logging;

let contests;

var ContestCountdownButton = GObject.registerClass(
    {},
    class ContestCountdownButton extends panelMenu.Button {
        _init(settings) {
            super._init(0.0, "Contest Countdown", false);

            this.settings = settings;
            contests = new Contests();
            this.refreshTimeout = null;

            this.buttonText = new St.Label({
                text: _("Intializing..."),
                style:
                    "padding-left: " +
                    this.settings.get_int("left-padding") +
                    "px;" +
                    "padding-right: " +
                    this.settings.get_int("right-padding") +
                    "px; ",
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.FILL,
            });


            // Create a new layout, add the text and add the actor to the layout
            let buttonBox = new St.BoxLayout();
            buttonBox.add(this.buttonText);
            this.add_actor(buttonBox);

            // create the popup menu
            this.update();

            //Place the actor/label at the "end" (rightmost) position within the left box
            main.panel._leftBox.insert_child_at_index(this, main.panel._leftBox.get_children().length);

            contests.connect('update-next-contest', this.updateTimerFunc.bind(this));
            this.updateTimerFunc();
        }

        updateTimerFunc() {
            let nextContest = contests.nextContest;
            log.info("running updateTimerFunc", nextContest);

            if (nextContest >= 0) {
                this.timerFunc = contests.allContests[nextContest].secondsTill.bind(
                    contests.allContests[nextContest]);
                this.start();
            }
            else {
                this.timerFunc = () => nextContest;
                this.setTimerText();
                this.stop();
            }
        }

        update() {
            this.menu.removeAll();
            this.menu.addMenuItem(new NextContestElement());
            this.menu.addMenuItem(new popupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(new AllContestHeading());
            this.menu.addMenuItem(new AllContestsList());
        }

        setTimerText() {
            let timeDiff = this.timerFunc(), timerText;

            if (timeDiff == -1)
                timerText = "Loading!";
            else if (timeDiff == -2)
                timerText = "No Upcoming Contest!";
            else if (timeDiff == -3)
                timerText = "Failed to Load Data!";
            else {
                // Calculate rest of the time
                let ss = timeDiff % 60;
                let mm = Math.floor((timeDiff % 3600) / 60);
                let hh = Math.floor((timeDiff % 86400) / 3600);
                let dd = Math.floor(timeDiff / 86400);

                if (this.settings.get_boolean("show-seconds"))
                    timerText = `${dd}d  ${hh}h  ${mm}m  ${ss}s`;
                else
                    timerText = `${dd}d  ${hh}h  ${mm}m`;
            }

            this.buttonText.set_text(timerText);

        }

        start() {
            this.stop();
            this.refreshTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                1,
                () => {
                    this.setTimerText();
                    return true;
                }
            );
        }

        stop() {
            if (this.refreshTimeout)
                GLib.source_remove(this.refreshTimeout);
            this.refreshTimeout = null;
        }

        destroy() {
            this.stop();
            contests.destroy();
            contests = null;
            this.settings = null;
            this.menu.removeAll();
            super.destroy();
        }
    }
);

var contestElement = GObject.registerClass(
    {},
    class contestElement extends popupMenu.PopupBaseMenuItem {
        _init(contest) {
            super._init();
            this.contest = contest;

            // create container to contain checkbox and contest details
            this._container = new St.BoxLayout({
                vertical: false,
            });

            // create checkbox
            this._checkbox = new checkBox.CheckBox();
            this._checkbox.checked = contest.participating;
            this._checkbox.connect("clicked", () => this.onClick());

            // make contest label
            this._contestLabel = new ContestDetails(contest);

            // add both to container
            this._container.add_child(this._checkbox);
            this._container.add_child(this._contestLabel);

            // add container to menu item
            this.add_child(this._container);

            // open registration page on click
            this.connect("button-press-event", function() {
                Util.spawn([
                    "xdg-open",
                    "https://codeforces.com/contestRegistration/" + contest.id,
                ]);
            });
        }
        onClick() {
            this.contest.participating = this._checkbox.checked;
            this.contest.onChange();
        }
    }
);

var ContestDetails = GObject.registerClass(
    {},
    class ContestDetails extends St.BoxLayout {
        _init(contest) {
            super._init({
                vertical: true,
            });

            var nameLabel = new St.Label({
                text: contest.name,
                style_class: "cc-contest-name",
            });
            nameLabel.clutter_text.line_wrap = true;

            let hh = Math.floor(contest.duration / 3600);
            let mm = Math.floor((contest.duration % 3600) / 60);

            var details =
                `Date\t\t:  ${contest.date.toLocaleFormat(
                    "%A %d %B %Y"
                )} ` +
                `\nTime\t\t:  ${contest.date.toLocaleFormat("%r")} ` +
                `\nDuration\t:  ${hh} hours ${mm} minutes`;

            var detailsLabel = new St.Label({
                text: details,
                style_class: "cc-inline",
            });

            this.add_child(nameLabel);
            this.add_child(detailsLabel);
        }
    }
);

var NextContestElement = GObject.registerClass(
    {},
    class NextContestElement extends popupMenu.PopupBaseMenuItem {
        constructor() {
            super();
            // make container
            this._container = new St.BoxLayout({
                vertical: true,
            });

            // make heading
            this._headingLabel = new St.Label({
                text: "Next Contest",
                style_class: "cc-contest-heading",
            });

            // creates the _contestLabel
            this.contest = null
            this._contestLabel = new St.Label({
                text: "No Upcoming Contest",
                style_class: "cc-inline",
            });


            // add two labels to container
            this._container.add_child(this._headingLabel);
            this._container.add_child(this._contestLabel);

            this.add_child(this._container);

            // open codeforces on click
            this.connect("button-press-event", () => {
                if (this.contest)
                    Util.spawn([
                        "xdg-open",
                        "https://codeforces.com/contestRegistration/" +
                        this.contest.id,
                    ]);
            });

            // automatically update when nextContest changes
            contests.connect('update-next-contest', this.update.bind(this));
            this.update();
        }

        update() {
            let nextContest = contests.nextContest >= 0 ?
                contests.allContests[contests.nextContest] : null;
            log.info("updating next contest label");

            if (this.contest != nextContest)
                this.contest = nextContest
            else
                return;

            // gives this error for some reason
            // clutter_actor_insert_child_at_index: assertion '
            // child -> priv -> parent == NULL' failed
            this._container.remove_child(this._contestLabel);

            this._contestLabel = this.contest != null ?
                new ContestDetails(this.contest) :
                new St.Label({
                    text: "No Upcoming Contest",
                    style_class: "cc-inline",
                });

            this._container.add_child(this._contestLabel);
        }
    }
);

class AllContestsList extends popupMenu.PopupMenuSection {
    constructor() {
        super();

        let scrollview = new St.ScrollView({
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
        });
        this.innerMenu = new popupMenu.PopupMenuSection();
        scrollview.add_actor(this.innerMenu.actor);

        // this.actor.add_actor(this.box);
        this.actor.add_actor(scrollview);

        this.update();
        // automatically update on update-contests signal
        contests.connect('update-contests', this.update.bind(this));
    }

    update() {
        this.innerMenu.removeAll();
        for (let contest of contests.allContests) {
            this.innerMenu.addMenuItem(new contestElement(contest));
        }
    }
}

let AllContestHeading = GObject.registerClass(
    {},
    class AllContestHeading extends popupMenu.PopupBaseMenuItem {
        _init(params) {
            super._init(params);
            this._headingLabel = new St.Label({
                text: "All Contest",
                style_class: "cc-contest-heading",
            });
            this.add_child(this._headingLabel);
            this.connect("button-press-event", function() {
                Util.spawn(["xdg-open", "https://codeforces.com/contests"]);
            });
        }
    }
);
