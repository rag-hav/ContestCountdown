#!/bin/sh

EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/contestcountdown@raghav/"
GNOME_VERSION="$( gnome-shell --version | cut -f '3' -d ' ' | cut -f '1' -d '.')" 

echo "Installing in $EXTENSION_DIR"
echo "Gnome version $GNOME_VERSION"
echo 

# remove previous installation
if [ -d "$EXTENSION_DIR" ]; then
    echo -n "Removing previous installation..."
    rm -rf "$EXTENSION_DIR"
    echo "done"
fi

# clone from the repository
echo "Cloning from repository..."
git clone https://github.com/rag-hav/ContestCountdown --branch gnome-44 --single-branch "$EXTENSION_DIR" || (printf "\nCouldn't clone repository\n" && exit 1)


if (( GNOME_VERSION < 40 )); then
    cd "$EXTENSION_DIR" || ( printf "\nFailed to change directory" && exit 1 )
    echo "Checking out old commit for Gnome version < 40"
    git checkout 32d1b1533a1ef24dae98c64389c2058f1a50c2f3
fi

# enable the extension
echo "Enabling extension..."
gnome-extensions enable contestcountdown@raghav || (printf "\nCouldn't enable extension" && exit 1)

# done
echo "Installation successful"
echo
echo "Restart your gnome shell for changes to take effect. Press 'Alt + F2' and enter 'r' in the dialog box"
echo "or just log out and log in, or restart the computer"
exit 0
