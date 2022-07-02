const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const St = imports.gi.St;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const Contests = Self.imports.contests.Contests;
const PopMenuMaker = Self.imports.popupmenu.PopMenuMaker;

//"User-defined" constants. If you've stumbled upon this extension, these values are the most likely you'd like to change.
var LEFT_PADDING,
    RIGHT_PADDING,
    EXTENSION_PLACE,
    EXTENSION_INDEX,
    SHOW_SECONDS,
    gschema,
    lastExtensionPlace,
    lastExtensionIndex;
var settings,
    onLeftPaddingChanged,
    onRightPaddingChanged,
    onExtensionPlaceChanged,
    onExtensionIndexChanged;
let ccMenu;

const ContestCountdown = GObject.registerClass(
    {},
    class ContestCountdown extends PanelMenu.Button {
        _init(settings) {
            super._init(0.0, "Contest Countdown ", false);

            this.contests = new Contests(() => PopMenuMaker(this));
            this.settings = settings;
            this.active = true;

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

            // Listen for update of padding in settings
            onLeftPaddingChanged = this.settings.connect(
                "changed::left-padding",
                this._leftPaddingChanged.bind(this)
            );
            onRightPaddingChanged = this.settings.connect(
                "changed::right-padding",
                this._rightPaddingChanged.bind(this)
            );

            // Create a new layout, add the text and add the actor to the layout
            let topBox = new St.BoxLayout();
            topBox.add(this.buttonText);
            this.add_actor(topBox);

            //Place the actor/label at the "end" (rightmost) position within the left box
            let children = Main.panel._leftBox.get_children();
            Main.panel._leftBox.insert_child_at_index(this, children.length);

            PopMenuMaker(this);

            this.refreshTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                1,
                () => {
                    this.buttonText.set_text(this._getTimerText().toString());
                    return true;
                }
            );
        }

        // Update padding of this.buttonText according to new value set in settings
        _leftPaddingChanged() {
            this.buttonText.set_style(
                "padding-left: " +
                this.settings.get_int("left-padding") +
                "px; " +
                "padding-right: " +
                this.settings.get_int("right-padding") +
                "px; "
            );
        }
        _rightPaddingChanged() {
            this.buttonText.set_style(
                "padding-left: " +
                this.settings.get_int("left-padding") +
                "px; " +
                "padding-right: " +
                this.settings.get_int("right-padding") +
                "px; "
            );
        }

        _getTimerText() {
            let timeDiff = this.contests.secondsTillNextContest();

            if (timeDiff == -1) return "Loading!";
            else if (timeDiff == Infinity) return "No Upcoming Contest!";
            else if (timeDiff == -Infinity) return "Failed to Load Data!";
            else if (timeDiff == this.settings.get_int("notify-before"))
                Main.notify("Contest Countdown", this.contests.nextContest.name);

            // Calculate rest of the time
            let ss = timeDiff % 60;
            let mm = Math.floor((timeDiff % 3600) / 60);
            let hh = Math.floor((timeDiff % (3600 * 24)) / 3600);
            let dd = Math.floor(timeDiff / (24 * 3600));

            if (this.settings.get_boolean("show-seconds"))
                return `${dd}d  ${hh}h  ${mm}m  ${ss}s`;
            else return `${dd}d  ${hh}h  ${mm}m`;
        }

        stop() {
            this.contests.stop();
            GLib.source_remove(this.refreshTimeout);
            this.menu.removeAll();
        }
    }
);

function init() { }

function enable() {
    // Load schema
    gschema = Gio.SettingsSchemaSource.new_from_directory(
        Self.dir.get_child("schemas").get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    // Load settings
    settings = new Gio.Settings({
        settings_schema: gschema.lookup(
            "org.gnome.shell.extensions.contestcountdown",
            true
        ),
    });

    // Mandatory for removing the spMenu from the correct location
    this.lastExtensionPlace = settings.get_string("extension-place");
    this.lastExtensionIndex = settings.get_int("extension-index");

    onExtensionPlaceChanged = this.settings.connect(
        "changed::extension-place",
        this.onExtensionLocationChanged.bind(this)
    );

    onExtensionIndexChanged = this.settings.connect(
        "changed::extension-index",
        this.onExtensionLocationChanged.bind(this)
    );

    ccMenu = new ContestCountdown(settings);
    Main.panel.addToStatusArea(
        "cc-indicator",
        ccMenu,
        settings.get_int("extension-index"),
        settings.get_string("extension-place")
    );
}

function disable() {
    this.settings.disconnect(onLeftPaddingChanged);
    this.settings.disconnect(onRightPaddingChanged);
    this.settings.disconnect(onExtensionPlaceChanged);
    this.settings.disconnect(onExtensionIndexChanged);

    ccMenu.stop();
    ccMenu.destroy();
}

// Removes spMenu from correct location and then adds it to new one
function onExtensionLocationChanged(settings, key) {
    const newExtensionPlace = this.settings.get_string("extension-place");
    const newExtensionIndex = this.settings.get_int("extension-index");

    if (
        this.lastExtensionPlace !== newExtensionPlace ||
        this.lastExtensionIndex !== newExtensionIndex
    ) {
        switch (this.lastExtensionPlace) {
            case "left":
                Main.panel._leftBox.remove_actor(ccMenu.container);
                break;
            case "center":
                Main.panel._centerBox.remove_actor(ccMenu.container);
                break;
            default:
                Main.panel._rightBox.remove_actor(ccMenu.container);
        }

        this.lastExtensionPlace = newExtensionPlace;
        this.lastExtensionIndex = newExtensionIndex;

        switch (newExtensionPlace) {
            case "left":
                Main.panel._leftBox.insert_child_at_index(
                    ccMenu.container,
                    newExtensionIndex
                );
                break;
            case "center":
                Main.panel._centerBox.insert_child_at_index(
                    ccMenu.container,
                    newExtensionIndex
                );
                break;
            default:
                Main.panel._rightBox.insert_child_at_index(
                    ccMenu.container,
                    newExtensionIndex
                );
        }
    }
}
