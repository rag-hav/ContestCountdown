const { main } = imports.ui;
const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { ContestCountdownButton } = Self.imports.popupmenu;

function init() {}

function enable() {
        console.debug("Starting");
        this._settings = this.getSettings()
        // let contests = new Contests();
        // contests.emit('update-contests');
        this.ccMenu = new ContestCountdownButton(this._settings);

        main.panel.addToStatusArea(
            "cc-indicator",
            this.ccMenu,
            this._settings.get_int("extension-index"),
            this._settings.get_string("extension-place")
        );
}

function disable() {
        console.debug("Stoping");
        this.ccMenu.destroy();
        this.ccMenu = null;
        this._settings = null;
}
