import { PostViewer, Settings } from '../models/Settings'

export class SettingsEditorVM {
    isFilterActive_RuSteemTeam: boolean = true;
    isFilterActive_RecentPost: boolean = true;
    isFilterActive_Rus: boolean = true;
    isFilterActive_Juliank: boolean = true;
    isFilterActive_Pictures: boolean = true;
    isFilterActive_NotRewarded: boolean = true;
    maxDays_Weekly: string = "";
    maxDays_Monthly: string = "";
    minRusLetters: string = "";
    postViewer: PostViewer = Settings.DefaultPostViewer;
    judges: string = "";
}
