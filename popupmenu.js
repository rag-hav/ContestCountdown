const Lang = imports.lang;
const CheckBox = imports.ui.checkBox;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Util = imports.misc.util;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Main = imports.ui.main;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const Self = imports.misc.extensionUtils.getCurrentExtension();

// https://github.com/ifl0w/RandomWallpaperGnome3/blob/develop/randomwallpaper%40iflow.space/elements.js

// make nextcontest global to access in onClick of contestElement
var nextContestElement;

var contestElement = GObject.registerClass({
        GTypeName: 'contestElement ',
}, class contestElement extends PopupMenu.PopupBaseMenuItem {

        _init(contest, contests) {
                super._init();
                // save these to access in onClick
                this.contest = contest;
                this.contests = contests;

                // create container to contain checkbox and contest details
                this._container = new St.BoxLayout({
                        vertical: false,
                });

                // create checkbox
                this._checkbox = new CheckBox.CheckBox();
                this._checkbox.checked = contest.participating;
                this._checkbox.connect('clicked', () => this.onClick());

                // make contest label
                this._contestLabel = new ContestDetails(contest);

                // add both to container
                this._container.add_child(this._checkbox);
                this._container.add_child(this._contestLabel);

                // add container to menu item
                this.actor.add_child(this._container);

                // open registration page on click
                this.actor.connect('button-press-event', function() {
                        Util.spawn(['xdg-open', "https://codeforces.com/contestRegistration/" + contest.id]);
                });
        }
        onClick() {
                this.contest.participating = this._checkbox.checked;
                this.contests.setNextContest();
                nextContestElement.update();
                this.contests.saveToFile();

        }
});

var ContestDetails = GObject.registerClass({
        GTypeName: 'ContestDetails',
}, class ContestDetails extends St.BoxLayout {

        _init(contest) {
                super._init({
                        vertical: true,
                });

                var nameLabel = new St.Label({
                        text: contest.name,
                        style_class: "cc-contest-name",
                });
                nameLabel.clutter_text.line_wrap = true;

                let hh = Math.floor(contest.durationSeconds / 3600);
                let mm = Math.floor((contest.durationSeconds % 3600) / 60);

                var details = `Date\t\t:  ${ new Date(1000 * contest.startTimeSeconds).toLocaleFormat("%A %d %B %Y") } ` +
                        `\nTime\t\t:  ${ new Date(1000 * contest.startTimeSeconds).toLocaleFormat("%r") } ` +
                        `\nDuration\t:  ${hh} hours ${mm} minutes`;

                var detailsLabel = new St.Label({
                        text: details,
                        style_class: "cc-inline",
                });


                this.add_child(nameLabel);
                this.add_child(detailsLabel);
        }

});

var NextContestElement = GObject.registerClass({
        GTypeName: 'NextContestElement',
}, class NextContestElement extends PopupMenu.PopupBaseMenuItem {
        _init(contests) {
                super._init();
                // make container
                this.contests = contests;
                this.contest = contests.nextContest;
                this._container = new St.BoxLayout({
                        vertical: true
                });

                // make heading
                this._headingLabel = new St.Label({
                        text: 'Next Contest',
                        style_class: "cc-contest-heading",
                });

                if (this.contest)
                        this._contestLabel = new ContestDetails(this.contest);
                else
                        this._contestLabel = new St.Label({
                                text: 'No Upcoming Contest',
                                style_class: "cc-inline",
                        });

                // add two labels to container
                this._container.add_child(this._headingLabel);
                this._container.add_child(this._contestLabel);

                this.actor.add_child(this._container);

                // open codeforces on click
                this.actor.connect('button-press-event', () => {
                        global.log("click");
                        Util.spawn(['xdg-open', "https://codeforces.com/contestRegistration/" + this.contests
                                .nextContest.id
                        ]);
                });
        }
        update() {
                if (this.contests.nextContest != this.contest) {
                        this.contest = this.contests.nextContest;
                        this._container.remove_child(this._contestLabel);
                        if (this.contest)
                                this._contestLabel = new ContestDetails(this.contest);
                        else
                                this._contestLabel = new St.Label({
                                        text: 'No Upcoming Contest',
                                        style_class: "cc-inline",
                                });

                        this._container.add_child(this._contestLabel);
                }

        }
});


class AllContestsList extends PopupMenu.PopupMenuSection {

        constructor(contests) {
                super();

                this.actor = new St.ScrollView({
                        hscrollbar_policy: Gtk.PolicyType.NEVER,
                        vscrollbar_policy: Gtk.PolicyType.AUTOMATIC
                });

                this.actor.add_actor(this.box);

                for (let contest of contests.allContests) {
                        this.addMenuItem(new contestElement(contest, contests));
                }

        }

};

var AllContestHeading =
        GObject.registerClass({
                GTypeName: 'AllContestHeading ',
        }, class AllContestHeading extends PopupMenu.PopupBaseMenuItem {

                _init(params) {

                        super._init(params);
                        this._headingLabel = new St.Label({
                                text: 'All Contest',
                                style_class: "cc-contest-heading",
                        });
                        this.actor.add_child(this._headingLabel);
                        this.actor.connect('button-press-event', function() {
                                Util.spawn(['xdg-open', "https://codeforces.com/contests"]);
                        });
                }

        });



function PopMenuMaker(parent) {

        // Next contest element
        nextContestElement = new NextContestElement(parent.contests);
        parent.menu.addMenuItem(nextContestElement);

        // seperator line
        parent.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // All contest 
        parent.menu.addMenuItem(new AllContestHeading());
        parent.menu.addMenuItem(new AllContestsList(parent.contests));

}
