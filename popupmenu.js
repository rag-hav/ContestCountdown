const Lang = imports.lang;
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


class AllContestsList extends PopupMenu.PopupMenuSection {

        constructor(contests) {
                super();

                this.actor = new St.ScrollView({
                        hscrollbar_policy: Gtk.PolicyType.NEVER,
                        vscrollbar_policy: Gtk.PolicyType.AUTOMATIC
                });

                this.actor.add_actor(this.box);

                for (let contest of contests.allContests) {
                        global.log(contest.id);
                        this.addMenuItem(new contestElement(contest));
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

                let hh = contest.durationSeconds / 3600;
                let mm = (contest.durationSeconds % 3600) / 60;

                var details = new Date(1000 * contest.startTimeSeconds).toLocaleFormat("%c") +
                        `\nDuration\t:  ${hh} hours ${mm} minutes` +
                        `\nType\t\t:  ${contest.type}`;


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
        _init(contest) {
                super._init();
                // add container
                this._container = new St.BoxLayout({
                        vertical: true
                });

                this._headingLabel = new St.Label({
                        text: 'Next Contest',
                        style_class: "cc-contest-heading",
                });

                this._contestLabel = new ContestDetails(contest);

                // add two labels to container
                this._container.add_child(this._headingLabel);
                this._container.add_child(this._contestLabel);

                this.actor.add_child(this._container);

                // open codeforces on click
                this.actor.connect('button-press-event', function() {
                        Util.spawn(['xdg-open', "https://codeforces.com/contestRegistration/" + contest.id]);
                });
        }
});


var contestElement = GObject.registerClass({
        GTypeName: 'contestElement ',
}, class contestElement extends PopupMenu.PopupBaseMenuItem {

        _init(contest) {
                super._init();
                this._contestLabel = new ContestDetails(contest);
                this.actor.add_child(this._contestLabel);
                this.actor.connect('button-press-event', function() {
                        Util.spawn(['xdg-open', "https://codeforces.com/contestRegistration/" + contest.id]);
                });
        }
});


function PopMenuMaker(parent) {

        // Next contest element
        parent.menu.addMenuItem(new NextContestElement(parent.contests.nextContest));
        // seperator line
        parent.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        // PopupMenuSection PopupSubMenuMenuItem PopupSeparatorMenuItem PopupBaseMenuItem
        parent.menu.addMenuItem(new AllContestHeading());
        parent.menu.addMenuItem(new AllContestsList(parent.contests));

}
