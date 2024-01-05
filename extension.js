import { ContestCountdownButton } from './popupmenu.js';
import * as main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ContestCountdown extends Extension {
    enable() {
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

    disable() {
        console.debug("Stoping");
        this.ccMenu.destroy();
        this.ccMenu = null;
        this._settings = null;
    }
}
