
export enum PostViewer {
    Steemit = "Steemit",
    Busy = "Busy",
}

export class Settings {
    static DefaultMaxDays_Weekly = 7;
    static DefaultMaxDays_Monthly = 28;
    static DefaultMinRusLetters = 500;
    static DefaultWhitelist = [];
    static DefaultPostViewer = PostViewer.Steemit;
    static DefaultJudges = ['afrosiab', 'agnessa', 'amalinavia', 'veta-less', 'zhivchak'];

    isFilterActive_RuSteemTeam: boolean = true;
    isFilterActive_RecentPost: boolean = true;
    isFilterActive_Rus: boolean = true;
    isFilterActive_Juliank: boolean = true;
    isFilterActive_Pictures: boolean = true;
    isFilterActive_NotRewarded: boolean = true;
    maxDays_Weekly: number = Settings.DefaultMaxDays_Weekly;
    maxDays_Monthly: number = Settings.DefaultMaxDays_Monthly;
    minRusLetters: number = Settings.DefaultMinRusLetters;
    postViewer: PostViewer = Settings.DefaultPostViewer;
    judges: string[] = Settings.DefaultJudges;
}
