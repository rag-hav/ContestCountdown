export class Contest {
    constructor(url, name, website, date, duration, participating = null) {
        this.url = url;
        this.name = name;
        this.website = website;
        this.date = date;
        this.duration = duration;
        this.participating = participating;
    }
}
