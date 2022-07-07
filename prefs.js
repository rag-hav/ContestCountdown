'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { log } = Self.imports.logging;

function init() { }

function buildPrefsWidget() {

    let settings = ExtensionUtils.getSettings();

    let prefsWidget = new Gtk.Grid({
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
        column_homogeneous: true,
    });

    let index = 0;

    let title = new Gtk.Label({
        label: '<b>' + Self.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.CENTER,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, index, 2, 1);

    /* left-padding */
    let leftPaddingLabel = new Gtk.Label({
        label: 'Left padding:',
        halign: Gtk.Align.START,
        visible: true
    });

    let leftPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1
        }),
        visible: true
    });

    index++;
    prefsWidget.attach(leftPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(leftPaddingEntry, 1, index, 1, 1);

    /* right-padding */
    let rightPaddingLabel = new Gtk.Label({
        label: 'Right padding:',
        halign: Gtk.Align.START,
        visible: true
    });

    let rightPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1
        }),
        visible: true
    });

    index++;
    prefsWidget.attach(rightPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(rightPaddingEntry, 1, index, 1, 1);


    /* extension-place */
    let extensionPlaceLabel = new Gtk.Label({
        label: 'Extension place:',
        halign: Gtk.Align.START,
        visible: true
    });

    let options = ['left', 'center', 'right'];
    let extensionPlaceComboBox = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true
    });
    for (let i = 0; i < options.length; i++) {
        extensionPlaceComboBox.append(options[i], options[i]);
    }
    extensionPlaceComboBox.set_active(options.indexOf(settings.get_string('extension-place')));

    index++;
    prefsWidget.attach(extensionPlaceLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionPlaceComboBox, 1, index, 1, 1);

    /* extension-index */
    let extensionIndexLabel = new Gtk.Label({
        label: 'Extension index:',
        halign: Gtk.Align.START,
        visible: true
    });

    let extensionIndexEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1
        }),
        visible: true
    });

    index++;
    prefsWidget.attach(extensionIndexLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionIndexEntry, 1, index, 1, 1);

    /* show-seconds */
    let showSecondsLabel = new Gtk.Label({
        label: 'Show seconds',
        halign: Gtk.Align.START,
        visible: true
    });

    let showSecondsSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true
    });

    index++;
    prefsWidget.attach(showSecondsLabel, 0, index, 1, 1);
    prefsWidget.attach(showSecondsSwitch, 1, index, 1, 1);



    /* notification-time */
    let notifyBeforeLabel = new Gtk.Label({
        label: 'Notify before (seconds)',
        halign: Gtk.Align.START,
        visible: true
    });
    let notifyBeforeEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: -1,
            upper: 10000,
            step_increment: 1
        }),
        visible: true
    });
    let notifyBeforeInfoLabel = new Gtk.Label({
        label: '-1 to turn off notification',
        halign: Gtk.Align.END,
        visible: true
    });


    index++;
    prefsWidget.attach(notifyBeforeLabel, 0, index, 1, 1);
    prefsWidget.attach(notifyBeforeEntry, 1, index, 1, 1);
    index++;
    prefsWidget.attach(notifyBeforeInfoLabel, 0, index, 2, 1);


    // https://docs.gtk.org/gio/method.Settings.bind.html
    // settings.bind('settings-key', object, 'property', Gio.SettingsBindFlags.DEFAULT);
    // change the value at key in settings when this property of object changes
    settings.bind('left-padding', leftPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('right-padding', rightPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('show-seconds', showSecondsSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('notify-before', notifyBeforeEntry, 'value', Gio.SettingsBindFlags.DEFAULT);

    extensionPlaceComboBox.connect('changed', function(widget) {
        settings.set_string('extension-place', options[widget.get_active()]);
    }.bind(this));
    settings.bind('extension-index', extensionIndexEntry, 'value', Gio.SettingsBindFlags.DEFAULT);

    return prefsWidget;
}
