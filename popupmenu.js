import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import * as Util from 'resource:///org/gnome/shell/misc/util.js';
import * as main from 'resource:///org/gnome/shell/ui/main.js';
import * as popupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as checkBox from 'resource:///org/gnome/shell/ui/checkBox.js';
import * as panelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import { ContestManager } from './contestmanager.js';
import { getDateString, getTimeString } from './utils.js';


let contestManager;

function getTimer(contest, onComplete, notifyBefore = - 1) {
    let notified = false;
    return () => {
        let res = Math.floor((contest.date - new Date()) / 1000);
        if (!notified && res <= notifyBefore) {
            main.notify("Contest Countdown", contest.name);
            notified = true;
        }
        else if (res <= 0)
            onComplete();
        return res;
    }
}

var ContestCountdownButton = GObject.registerClass(
    {},
    class ContestCountdownButton extends panelMenu.Button {
        _init(settings) {
            super._init(0.0, "Contest Countdown", false);

            contestManager = new ContestManager(settings);
            this.settings = settings;

            this.refreshTimeout = null;

            this.box = new St.BoxLayout();
            this.add_child(this.box);

            this.label = new St.Label({
                text: _("Intializing..."),
                y_align: Clutter.ActorAlign.CENTER
            });

            this.box.add_child(this.label);

            const EXTENSION_INDEX = this.settings.get_int('extension-index');
            const EXTENSION_PLACE = this.settings.get_string('extension-place');
            main.panel.addToStatusArea('Contest Countdown', this, EXTENSION_INDEX, EXTENSION_PLACE);

            // create the popup menu
            this.updateMenu();
            this.updatePadding();
            this.updateTrayPosition();


            this.settings.connect('changed::left-padding', this.updatePadding.bind(this));
            this.settings.connect('changed::right-padding', this.updatePadding.bind(this));
            this.settings.connect('changed::extension-index', this.updateTrayPosition.bind(this));
            this.settings.connect('changed::extension-place', this.updateTrayPosition.bind(this));


            contestManager.connect('update-next-contest', this.updateTimerFunc.bind(this));
            this.updateTimerFunc();
        }


        updatePadding() {
            let LEFT_PADDING = this.settings.get_int('left-padding');
            let RIGHT_PADDING = this.settings.get_int('right-padding');
            this.box.set_style("padding-left: " + LEFT_PADDING + "px;"
                + "padding-right: " + RIGHT_PADDING + "px; ");
        }

        updateTrayPosition() {
            const EXTENSION_PLACE = this.settings.get_string('extension-place');
            const EXTENSION_INDEX = this.settings.get_int('extension-index');

            if (this.container.get_parent())
                this.container.get_parent().remove_child(this.container);

            if (EXTENSION_PLACE == "left") {
                main.panel._leftBox.insert_child_at_index(this.container, EXTENSION_INDEX);
            }
            else if (EXTENSION_PLACE == "center") {
                main.panel._centerBox.insert_child_at_index(this.container, EXTENSION_INDEX);
            }
            else if (EXTENSION_PLACE == "right") {
                main.panel._rightBox.insert_child_at_index(this.container, EXTENSION_INDEX);
            }
        }

        updateTimerFunc() {
            let nextContest = contestManager.nextContest;
            console.debug("running updateTimerFunc", nextContest);

            if (nextContest >= 0) {
                this.timerFunc = getTimer(contestManager.allContests[nextContest], contestManager.onChange.bind(contestManager), this.settings.get_int("notify-before"));
                this.start();
            }
            else {
                this.timerFunc = () => nextContest;
                this.setTimerText();
                this.stop();
            }
        }

        updateMenu() {
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

            this.label.set_text(timerText);

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
            contestManager.destroy();
            contestManager = null;
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
                    contest.url,
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
                `\nWebsite\t:  ${contest.website} ` +
                `\nDate\t\t:  ${getDateString(contest.date)} ` +
                `\nTime\t\t:  ${getTimeString(contest.date)} ` +
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
                        this.contest.url,
                    ]);
            });

            // automatically update when nextContest changes
            contestManager.connect('update-next-contest', this.update.bind(this));
            this.update();
        }

        update() {
            let nextContest = contestManager.nextContest >= 0 ?
                contestManager.allContests[contestManager.nextContest] : null;
            console.debug("updating next contest label");

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
        contestManager.connect('update-contests', this.update.bind(this));
    }

    update() {
        this.innerMenu.removeAll();
        for (let contest of contestManager.allContests) {
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

export { ContestCountdownButton };
