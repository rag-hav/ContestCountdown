const Gio = imports.gi.Gio;
const Adw = imports.gi.Adw;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { getClistHosts } = Self.imports.scraper;

function init(){}

function fillPreferencesWindow(window) {
        let settings = this.getSettings();

        //panel page:
        let page = addPreferencesPage(window, 'Panel', 'computer-symbolic');

        let group = addGroup(page, 'Position');
        addDropDown(settings, group, 'extension-place', 'Extension place', { 'left': 'left', 'center': 'center', 'right': 'right' }, undefined);
        addSpinButton(settings, group, 'extension-index', 'Extension index', 0, 20, "Set widget location within with respect to other adjacent widgets");
        addSpinButton(settings, group, 'left-padding', 'Left padding', 0, 500, undefined);
        addSpinButton(settings, group, 'right-padding', 'Right padding', 0, 500, undefined);

        group = addGroup(page, 'Display');
        addSwitch(settings, group, 'show-seconds', 'Show seconds in panel');

        page = addPreferencesPage(window, 'Behaviour', 'application-x-addon-symbolic');
        group = addGroup(page, 'Notification');
        addSwitch(settings, group, 'enable-notification', 'Notify before contest');
        bindEnabled(settings, 'enable-notification',
            addSpinButton(settings, group, 'notify-before', 'Seconds to notify before contest start', 1, 10000)
        )
        page = addPreferencesPage(window, 'API', 'network-transmit-symbolic');

        group = addGroup(page, 'Refresh Data');
        addButton(group, 'Refresh contest data', () => {
            settings.set_boolean("refresh-signal", !settings.get_boolean("refresh-signal"));
        });

        group = addGroup(page, 'Usage');
        addSwitch(settings, group, 'enable-clist', 'Use Clist API', 'Uses the codeforces.com api if this is disabled');
        addEntry(settings, group, 'clist-username', 'Clist username', '');
        addEntry(settings, group, 'clist-token', 'Clist Token', 'Get token from https://clist.by/api/v4/doc/');

        group = addGroup(page, 'List of websites with currently active contests');
        let sourcesListEntry = addWideEntry(settings, group, undefined, '[ Press the button below to update ]', "[ Press the button below to update ]");
        sourcesListEntry.set_editable(false);

        let updateEntries = () => {
            sourcesListEntry.set_text("[ Loading... ]");
            sourcesListEntry.set_text(getClistHosts(
                settings.get_string("clist-username"),
                settings.get_string("clist-token")
            ));
        }

        let updateButton = addButton(group, 'Update list of websites with currently active contests', updateEntries);
        updateButton.set_margin_top(10);


        group = addGroup(page, 'Filters for websites');
        addEntry(settings, group, 'clist-websites-blacklist', 'Ignore list', 'Separate entries with commas');
        addEntry(settings, group, 'clist-websites-whitelist', 'Allow list', 'Separate entries with commas');
        addSwitch(settings, group, 'use-whitelisted-websites-only', 'Ignore all websites except allowed ones');

}


function addPreferencesPage(window, name, icon) {
    let thisPage = new Adw.PreferencesPage({
        name: name,
        title: name,
        icon_name: icon,
    });
    window.add(thisPage);
    return thisPage;
}

function addGroup(page, title) {
    let thisGroup = new Adw.PreferencesGroup({ title: title });
    page.add(thisGroup);
    return thisGroup;
}

// Adwaita 'Row' functions, they add a row to the target group with the widget(s) specified

function addSpinButton(settings, group, setting, labelstring, lower, upper, labeltooltip) {
    let row = buildActionRow(labelstring, labeltooltip);

    let thisResetButton = buildResetButton(settings, setting);

    let thisSpinButton = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: lower,
            upper: upper,
            step_increment: 1
        }),
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
        visible: true
    });
    settings.bind(setting, thisSpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    row.add_suffix(thisResetButton);
    row.add_suffix(thisSpinButton);

    thisSpinButton.connect('changed', () => {
        if (thisSpinButton.text == settings.get_default_value(setting).print(true))
            thisResetButton.set_visible(false)
        else
            thisResetButton.set_visible(true)
    })

    group.add(row);
    return row;
}

function addDropDownsList(settings, group, settingsList, labelstring, optionsList, labeltooltip, width) {
    let row = buildActionRow(labelstring, labeltooltip);

    let thisDropDownList = [];//keep list of all dropDowns created (required for reset button generation/visibility)
    for (let i = 0; i < settingsList.length; i++)//generate dropdown for each setting
        thisDropDownList.push(buildDropDown(settings, settingsList[i], optionsList[i], width));

    //generate reset button (single button for all drop downs)
    let thisResetButton = buildDropDownResetButton(settings, settingsList, thisDropDownList, optionsList);
    row.add_suffix(thisResetButton);

    for (let i = 0; i < thisDropDownList.length; i++) {
        thisDropDownList[i].connect('notify::selected-item', () => {
            settings.set_string(settingsList[i], Object.values(optionsList[i])[thisDropDownList[i].get_selected()]);
            //set reset button visibility to true if any of the settings is different from default
            let setVisible = setDropDownResetVisibility(settings, settingsList, thisDropDownList, optionsList);
            thisResetButton.set_visible(setVisible);
        });
        row.add_suffix(thisDropDownList[i]);
    }

    group.add(row);
    return thisDropDownList;
}

function addDropDown(settings, group, setting, labelstring, options, labeltooltip, width = 105) {
    return addDropDownsList(settings, group, [setting], labelstring, [options], labeltooltip, width);
}

function addDoubleDropDown(settings, group, setting1, setting2, labelstring, options1, options2, labeltooltip, width = 135) {
    return addDropDownsList(settings, group, [setting1, setting2], labelstring, [options1, options2], labeltooltip, width);
}

function addTripleDropDown(settings, group, setting1, setting2, setting3, labelstring, options1, options2, options3, labeltooltip, width = 81) {
    return addDropDownsList(settings, group, [setting1, setting2, setting3], labelstring, [options1, options2, options3], labeltooltip, width);
}

function addSwitch(settings, group, setting, labelstring, labeltooltip) {
    let row = buildActionRow(labelstring, labeltooltip);

    let thisResetButton = buildResetButton(settings, setting);
    row.add_suffix(thisResetButton);

    let thisSwitch = new Gtk.Switch({
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
        visible: true
    });
    settings.bind(setting, thisSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    row.add_suffix(thisSwitch);

    thisSwitch.connect('notify::active', () => {
        if (thisSwitch.state == (settings.get_default_value(setting).print(true) === "true"))
            thisResetButton.set_visible(false);
        else
            thisResetButton.set_visible(true)
    })

    group.add(row)
}

function addEntry(settings, group, setting, labelstring, labeltooltip) {
    let row = buildActionRow(labelstring, labeltooltip);

    let thisResetButton = buildResetButton(settings, setting);
    row.add_suffix(thisResetButton);

    let thisEntry = new Gtk.Entry({
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
        width_request: 200,
        visible: true
    });
    settings.bind(setting, thisEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
    row.add_suffix(thisEntry);

    thisEntry.connect('changed', () => {
        if (thisEntry.text == settings.get_default_value(setting).print(true).replaceAll('\'', ''))
            thisResetButton.set_visible(false);
        else
            thisResetButton.set_visible(true)
    })

    group.add(row)
}

function addWideEntry(settings, group, setting, placeholder, labeltooltip) {
    let thisEntry = new Gtk.Entry({
        visible: true,
        secondary_icon_name: '',
        secondary_icon_tooltip_text: "Reset to Default"
    });
    if (labeltooltip)
        thisEntry.set_tooltip_text(labeltooltip)

    if (setting) {
        settings.bind(setting, thisEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
        thisEntry.connect('icon-press', () => {
            thisEntry.set_icon_from_icon_name(1, '');
            settings.reset(setting)
        });

        thisEntry.connect('changed', () => {
            if (settings.get_string(setting)) //default for WideEntry is to be empty
                thisEntry.set_icon_from_icon_name(1, 'edit-clear-symbolic');
            else
                thisEntry.set_icon_from_icon_name(1, '');
        })

        if (settings.get_string(setting))
            thisEntry.set_icon_from_icon_name(1, 'edit-clear-symbolic');
    }

    thisEntry.set_placeholder_text(placeholder);
    group.add(thisEntry);

    return thisEntry;
}

function addResetButton(settings, group, labelstring, options, dropDowns) {
    let thisButton = buildButton(labelstring, () => {
        options.forEach(option => {
            settings.reset(option);
        });
        if (dropDowns) {
            dropDowns.forEach(dropDown => {
                dropDown.set_selected(dropDown._defaultValueIndex);
            });
        }
    });

    group.add(thisButton);

    return thisButton;
}

function addButton(group, labelstring, callback) {
    let thisButton = buildButton(labelstring, callback);
    group.add(thisButton);
    return thisButton;
}

// 'build' functions, they build "generic" widgets of the specified type and returns it

function buildActionRow(labelstring, labeltooltip) {
    let row = new Adw.ActionRow({ title: labelstring });
    if (labeltooltip) {
        if (labeltooltip.length > 70) { //could make every tooltip a button if preferred
            let thisInfoButton = buildInfoButton(labeltooltip);
            row.add_suffix(thisInfoButton);
        }
        else
            row.subtitle = labeltooltip;
    }

    return row;
}

function buildInfoButton(labeltooltip) {
    let thisInfoButton = new Gtk.MenuButton({
        valign: Gtk.Align.CENTER,
        icon_name: 'info-symbolic',
        visible: true
    });
    thisInfoButton.add_css_class('flat');
    // thisInfoButton.add_css_class('circular');
    let thisPopover = new Gtk.Popover();
    let thisLabel = new Gtk.Label({
        label: labeltooltip
    });
    thisPopover.set_child(thisLabel);
    thisInfoButton.set_popover(thisPopover);

    return thisInfoButton;
}

function buildResetButton(settings, setting) {
    let thisResetButton = new Gtk.Button({
        valign: Gtk.Align.CENTER,
        icon_name: 'edit-clear-symbolic-rtl',
        visible: false
    });

    //hide if matches default setting
    if (settings.get_value(setting).print(true) != settings.get_default_value(setting).print(true))
        thisResetButton.set_visible(true);

    thisResetButton.add_css_class('flat');
    thisResetButton.set_tooltip_text('Reset to Default');

    thisResetButton.connect('clicked', () => { settings.reset(setting) });

    return thisResetButton;
}

function buildDropDown(settings, setting, options, width) {
    let thisDropDown = new Gtk.DropDown({
        model: Gtk.StringList.new(Object.keys(options)),
        selected: Object.values(options).indexOf(settings.get_string(setting)),
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END
    });

    thisDropDown._defaultValueIndex = Object.values(options).indexOf(settings.get_default_value(setting).get_string()[0]);

    if (width)
        thisDropDown.set_size_request(width, -1);

    return thisDropDown;
}

function buildDropDownResetButton(settings, setting, dropDown, options) {
    let thisResetButton = new Gtk.Button({
        valign: Gtk.Align.CENTER,
        icon_name: 'edit-clear-symbolic-rtl',
        visible: false
    });

    //hide if default setting
    setting.forEach((item) => {
        if (settings.get_value(item).print(true) != settings.get_default_value(item).print(true))
            thisResetButton.set_visible(true);
    })

    thisResetButton.add_css_class('flat');
    thisResetButton.set_tooltip_text('Reset to Default');

    thisResetButton.connect('clicked', () => {
        for (let i = 0; i < setting.length; i++) {
            settings.reset(setting[i]);
            dropDown[i].set_selected(Object.values(options[i]).indexOf(settings.get_string(setting[i])));
        }
    });

    return thisResetButton;
}

function buildButton(labelstring, callback) {
    let button = new Gtk.Button({
        label: labelstring,
        margin_top: 30,
        visible: true
    });
    button.connect('clicked', callback);

    return button;
}

// helper functions

function setDropDownResetVisibility(settings, settingsList, thisDropDownList, optionsList) { //show reset button if any of the values is different from default
    let setVisible = false;
    for (let i = 0; i < thisDropDownList.length; i++) {
        let thisDropDownValue = Object.values(optionsList[i])[thisDropDownList[i].get_selected()];
        if (thisDropDownValue != settings.get_default_value(settingsList[i]).print(true).replaceAll('\'', ''))
            setVisible = true;
    }
    return setVisible;
}

function bindEnabled(settings, setting, element) {
    settings.bind(setting, element, 'sensitive', Gio.SettingsBindFlags.GET);
}
