const Soup = imports.gi.Soup;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const { Contest } = Self.imports.contest;
const { getCurrentTime } = Self.imports.utils;

let session = new Soup.Session();

function getFromUrl(url) {
    let message = Soup.Message.new("GET", url);
    const bytes = session.send_and_read(message, null);

    const { statusCode } = message;
    const phrase = Soup.Status.get_phrase(statusCode);
    if (statusCode !== Soup.Status.OK)
        throw new Error(`Unexpected response: ${phrase}`);

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(bytes.get_data()));
}

function getClist(clistUsername, clistToken, useWhitelist, whitelist, blacklist) {
    whitelist = whitelist.split(',').map(e => e.trim());
    blacklist = blacklist.split(',').map(e => e.trim());

    let result = [];
    let response = getFromUrl(`https://clist.by/api/v4/contest/?start__gte=${encodeURIComponent(getCurrentTime())}&username=${clistUsername}&api_key=${clistToken}&format=json`)
    for (let entry of response.objects) {
        if (useWhitelist ? whitelist.includes(entry.host) : !blacklist.includes(entry.host))
            result.push(new Contest(
                entry.href,
                entry.event,
                entry.host,
                new Date(entry.start),
                entry.duration
            ));
    }
    return result;

}
function getCodeforces() {
    let result = [];
    let response = getFromUrl("https://codeforces.com/api/contest.list?gym=false");
    if (!response || response.status !== "OK") {
        throw new Error("Failed to get codeforces data");
    }

    for (let entry of response.result) {
        if (entry.phase === "BEFORE") {
            result.push(new Contest(
                entry.id,
                entry.name,
                "codeforces.com",
                new Date(entry.startTimeSeconds * 1000),
                entry.durationSeconds
            ));
        }
    }
    return result;
}


function getClistHosts(clistUsername, clistToken) {
    try {
        let hosts = new Set(getClist(clistUsername, clistToken, false, "", "").map((contest) => contest.website));
        return [...hosts].join(",");
    }
    catch (e) {
        return `[ {e} ]`;
    }
}
