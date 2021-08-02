#!/bin/sh

EXTENSION_DIR="${HOME}/.local/share/gnome-shell/extensions/contestcountdown@raghav/"

# remove previous installation
if [ -d "$EXTENSION_DIR" ]; then
        echo -n "Removing previous installation..."
        rm -rf "$EXTENSION_DIR"
        echo "done"
fi

# clone from the repository
echo "Cloning from repository..."
git clone https://github.com/rag-hav/ContestCountdown.git --branch master --single-branch "$EXTENSION_DIR" || (echo "\nCouldn't clone repository" && exit 1)

# enable the extension
echo "Enabling extension..."
gnome-extensions enable contestcountdown@raghav || (echo "\nCouldn't enable extension" && exit 1)

# done
echo "Installation successful"
echo
echo "Restart your gnome shell for changes to take effect. Press 'Alt + F2' and enter 'r' in the dialog box"
echo "or just log out and log in, or restart the computer"
exit 0
