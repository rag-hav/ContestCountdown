const { main } = imports.ui;
const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { ContestCountdownButton } = Self.imports.popupmenu;
const { Contests } = Self.imports.contests;
const { log } = Self.imports.logging;
const GObject = imports.gi.GObject;

// version
const Config = imports.misc.config;
const [major, minor] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));

let settings,
    ccMenu;

function init() { }

function enable() {
    log.info("Starting", major, minor);
    settings = ExtensionUtils.getSettings()
    // let contests = new Contests();
    // contests.emit('update-contests');
    ccMenu = new ContestCountdownButton(settings);

    main.panel.addToStatusArea(
        "cc-indicator",
        ccMenu,
        settings.get_int("extension-index"),
        settings.get_string("extension-place")
    );
}

function disable() {
    log.info("Stoping");
    ccMenu.destroy();
    ccMenu = null;
    settings = null;
}
