import PostVM from './PostVM'
import * as steem from 'steem'
import { LocalStorageKey, PostsPerPage, ContestTag, ContestAccount } from '../constants'
import { getDiscussionsByCreatedAsync, getDynamicGlobalPropertiesAsync, getAccountsAsync, getAccountVotesAsync, getContentAsync } from '../steemWrappers'
import { Settings } from '../models/Settings'
import { SettingsEditorVM } from './SettingsEditorVM'
import { Dictionary } from 'lodash';
import { ContestStage } from '../models/ContestStage'
import * as counterpart from 'counterpart'
import { CurrentLocale } from '../Translator'
//import * as debounce from 'lodash.debounce'
const debounce = require("lodash.debounce")

function topPosition(domElt: any): number {
    if (!domElt) {
        return 0;
    }
    return domElt.offsetTop + topPosition(domElt.offsetParent);
}

function settings_parseInt(value: any, defaultValue: number, minValue: number, maxValue: number): number {
    const parsed = Number.parseInt(value);
    if (parsed) {
        if (parsed >= minValue && parsed <= maxValue)
            return parsed;
        else
            return defaultValue;
    } else {
        return defaultValue;
    }
}

function settings_parseStringArray(value: any, defaultValue: string[]): string[] {
    if (value && Array.isArray(value) && value.length)
        return value;
    else
        return defaultValue;
}

const MsInHour: number = 60 * 60 * 1000;

export default class AppVM {
    blogmode: boolean = false;
    isSettingsPanelVisible: boolean = false;
    private _posts_Weekly: PostVM[] = [];
    private _posts_Monthly: PostVM[] = [];
    settings: Settings = new Settings();
    settingsEditor: SettingsEditorVM = new SettingsEditorVM();
    isLoading: number = 0;
    private _isAllLoaded_Weekly: boolean = false;
    private _isAllLoaded_Monthly: boolean = false;
    loadMoreCount: number = 0;
    isError: boolean = false;
    loadingDetails: string = "";
    _showAllPosts: boolean = true;
    _contestStage: ContestStage = ContestStage.Weekly;
    private _profitvoteVotes: { author: string, permlink: string, time: Date }[] = [];

    get _posts(): PostVM[] {
        switch (this._contestStage) {
            case ContestStage.Weekly:
                return this._posts_Weekly;
            case ContestStage.Monthly:
                return this._posts_Monthly;
            default:
                throw new Error(`Contest stage is not supported: ${this._contestStage}`);
        }
    }

    get postCount(): number {
        return this._posts.length;
    }

    get visiblePostCount_Weekly(): number {
        if (this._showAllPosts)
            return this._posts.length;
        else
            return this._posts.filter(x => x.isEligiblePost).length;
    }

    get visiblePostCount_Monthly(): number {
        if (this._showAllPosts)
            return this._posts.length;
        else
            return this._posts.filter(x => x.isEligiblePost).length;
    }

    get visiblePostCount(): number {
        switch (this._contestStage) {
            case ContestStage.Weekly: return this.visiblePostCount_Weekly;
            case ContestStage.Monthly: return this.visiblePostCount_Monthly;
            default: throw new Error(`Contest stage is not supported: ${this._contestStage}`);
          }
    }

    constructor() {
        this.loadSettings();
        this.attachScrollListener();
        this.loadMore();
    }

    async onContestStageChanged(): Promise<void> {
        await this.reloadAll();
    }

    async reloadAll(): Promise<void> {
        this._profitvoteVotes = [];
        this._posts_Weekly = [];
        this._posts_Monthly = [];
        this._isAllLoaded_Weekly = false;
        this._isAllLoaded_Monthly = false;
        await this.loadMore();
    }

    loadMoreIfNeeded() {
        // console.log("loadMoreIfNeeded", this.visiblePostCount, PostsPerPage)
        if (this.visiblePostCount < PostsPerPage)
            this.loadMore(PostsPerPage); // только запускаем, но не ждем завершения
    }

    async loadMore(minVisiblePosts?: number): Promise<void> {
        if (this.loadMoreCount !== 0) return;
        // console.log("Load older posts");
        if (!minVisiblePosts)
            minVisiblePosts = this.visiblePostCount + PostsPerPage;
        this.isError = false;

        this.isLoading++;
        this.loadMoreCount++;
        try {
            switch (this._contestStage) {
                case ContestStage.Weekly:
                    await this.loadMore_Weekly(minVisiblePosts);
                    break;
                case ContestStage.Monthly:
                    await this.loadMore_Monthly(minVisiblePosts);
                    break;
                default:
                    throw new Error(`Contest stage is not supported: ${this._contestStage}`);
            }
        } catch (ex) {
            console.error(ex);
            this.isError = true;
        } finally {
            this.loadMoreCount--;
            this.isLoading--;
            this.loadingDetails = "";
        }
    }

    async loadMore_Weekly(minVisiblePosts: number): Promise<void> {
        let sAuthor: string = "";
        let sPermlink: string = "";
        let sExclude = true;
        while (this._contestStage === ContestStage.Weekly && !this._isAllLoaded_Weekly && minVisiblePosts > this.visiblePostCount_Weekly && !(!this._showAllPosts && this.settings.isFilterActive_RecentPost && this._posts.length && !this._posts[this._posts.length - 1].isRecentPost)) {
            if (this._posts_Weekly.length) {
                sAuthor = this._posts[this._posts.length - 1].author;
                sPermlink = this._posts[this._posts.length - 1].permlink;
                sExclude = true;
            } else {
                sAuthor = "";
                sPermlink = "";
                sExclude = false;
            }

            let posts = await getDiscussionsByCreatedAsync(ContestTag, PostsPerPage, sAuthor, sPermlink);
            this._isAllLoaded_Weekly = posts.length !== PostsPerPage;
            if (sExclude)
                posts = posts.slice(1);
            const postVMs = posts.map(x => PostVM.create(x));
            this.filterPosts(postVMs);
            this._posts_Weekly.push(...postVMs);
        }
    }

    async loadMore_Monthly(minVisiblePosts: number): Promise<void> {
        if (!this._profitvoteVotes.length) {
            this.loadingDetails = counterpart("bvc.loading_votes") + ContestAccount;
            this._profitvoteVotes = (await getAccountVotesAsync(ContestAccount))
                .map(x => {
                    const t = x.authorperm.split("/");
                    return { author: t[0], permlink: t[1], time: new Date(x.time.concat("Z")) };
                })
                .sort((a, b) => b.time.valueOf() - a.time.valueOf());
        }

        while (this._contestStage === ContestStage.Monthly && !this._isAllLoaded_Monthly && minVisiblePosts > this.visiblePostCount_Monthly && !(!this._showAllPosts && this.settings.isFilterActive_RecentPost && this._posts.length && !this._posts[this._posts.length - 1].isRecentPost)) {
            if (this._posts_Monthly.length < this._profitvoteVotes.length) {
                const postDescriptor = this._profitvoteVotes[this._posts_Monthly.length];
                this.loadingDetails = counterpart("bvc.loading_post") + `${postDescriptor.author}/${postDescriptor.permlink}`;
                let post = await getContentAsync(postDescriptor.author, postDescriptor.permlink);
                const postVM = PostVM.create(post);
                this.filterPost(postVM);
                this._posts_Monthly.push(postVM);
            } else {
                this._isAllLoaded_Monthly = true;
            }
        }
    }

    filterPost(post: PostVM): void {
        post.isRecentPost = 
            (this._contestStage === ContestStage.Weekly && ((Date.now() - post.created.valueOf()) / MsInHour <= 24 * this.settings.maxDays_Weekly)) ||
            (this._contestStage === ContestStage.Monthly && ((Date.now() - post.created.valueOf()) / MsInHour <= 24 * this.settings.maxDays_Monthly));
        post.isRus = post.rusLetterCount > this.settings.minRusLetters;
        post.isEligiblePost = 
            (!this.settings.isFilterActive_RuSteemTeam || post.hasRuSteemTeamTag) &&
            (!this.settings.isFilterActive_RecentPost || post.isRecentPost) &&
            (!this.settings.isFilterActive_Rus || post.isRus || (this.settings.isFilterActive_Juliank && post.hasJuliankTag)) &&
            (!this.settings.isFilterActive_Pictures || post.imageUrl !== undefined) &&
            (this._contestStage === ContestStage.Weekly && (!this.settings.isFilterActive_NotRewarded || post.profitvoteVoteTime === undefined));
        
        const judgeVotes = post.active_votes
            .filter(x => this.settings.judges.indexOf(x.voter) >= 0)
            .map(x => 
            { 
                return { voter: x.voter, time: new Date(x.time.concat("Z")), percent: x.percent / 100.0 } 
            });
        post.judgeVoteCount = judgeVotes.length;
        post.judgeVoteDescription = 
            judgeVotes.length ?
            judgeVotes.reduce((acc, x) => acc.concat(`\n${x.voter} ${x.percent.toFixed(2)}% (${x.time.toLocaleString(CurrentLocale)})`), counterpart("bvc.judges") + ":") :
            "";
    }

    filterPosts(posts: PostVM[]): void {
        for (const post of posts) this.filterPost(post);
    }

    showSettingsPanel(): void {
        this.isSettingsPanelVisible = true;

        this.settingsEditor.isFilterActive_RuSteemTeam = this.settings.isFilterActive_RuSteemTeam;
        this.settingsEditor.isFilterActive_RecentPost = this.settings.isFilterActive_RecentPost;
        this.settingsEditor.isFilterActive_Rus = this.settings.isFilterActive_Rus;
        this.settingsEditor.isFilterActive_Juliank = this.settings.isFilterActive_Juliank;
        this.settingsEditor.isFilterActive_Pictures = this.settings.isFilterActive_Pictures;
        this.settingsEditor.isFilterActive_NotRewarded = this.settings.isFilterActive_NotRewarded;
        this.settingsEditor.maxDays_Weekly = this.settings.maxDays_Weekly.toString();
        this.settingsEditor.maxDays_Monthly = this.settings.maxDays_Monthly.toString();
        this.settingsEditor.minRusLetters = this.settings.minRusLetters.toString();
        this.settingsEditor.postViewer = this.settings.postViewer;
        this.settingsEditor.judges = this.settings.judges.join(", ");
    }

    hideSettingsPanel(): void {
        this.isSettingsPanelVisible = false;
    }

    applySettings(): void {
        this.settings.isFilterActive_RuSteemTeam = this.settingsEditor.isFilterActive_RuSteemTeam;
        this.settings.isFilterActive_RecentPost = this.settingsEditor.isFilterActive_RecentPost;
        this.settings.isFilterActive_Rus = this.settingsEditor.isFilterActive_Rus;
        this.settings.isFilterActive_Juliank = this.settingsEditor.isFilterActive_Juliank;
        this.settings.isFilterActive_Pictures = this.settingsEditor.isFilterActive_Pictures;
        this.settings.isFilterActive_NotRewarded = this.settingsEditor.isFilterActive_NotRewarded;
        this.settings.maxDays_Weekly = settings_parseInt(this.settingsEditor.maxDays_Weekly, Settings.DefaultMaxDays_Weekly, 1, 7);
        this.settings.maxDays_Monthly = settings_parseInt(this.settingsEditor.maxDays_Monthly, Settings.DefaultMaxDays_Monthly, 7, 100);
        this.settings.minRusLetters = settings_parseInt(this.settingsEditor.minRusLetters, Settings.DefaultMinRusLetters, 0, 1000000);
        this.settings.postViewer = this.settingsEditor.postViewer !== undefined ? this.settingsEditor.postViewer : Settings.DefaultPostViewer;
        this.settings.judges = this.settingsEditor.judges ? this.settingsEditor.judges.split(",").map(x => x.trim()) : []

        this.saveSettings();

        this.settingsEditor.maxDays_Weekly = this.settings.maxDays_Weekly.toString();
        this.settingsEditor.maxDays_Monthly = this.settings.maxDays_Monthly.toString();
        this.settingsEditor.minRusLetters = this.settings.minRusLetters.toString();

        this.filterPosts(this._posts);
        this.loadMoreIfNeeded();
    }

    loadSettings(): void {
        this.settings = new Settings();
        try {
            const settingsString = localStorage.getItem(LocalStorageKey);
            const settings: Settings = settingsString ? JSON.parse(settingsString) : new Settings();

            this.settings.isFilterActive_RuSteemTeam = settings.isFilterActive_RuSteemTeam;
            this.settings.isFilterActive_RecentPost = settings.isFilterActive_RecentPost;
            this.settings.isFilterActive_Rus = settings.isFilterActive_Rus;
            this.settings.isFilterActive_Juliank = settings.isFilterActive_Juliank;
            this.settings.isFilterActive_Pictures = settings.isFilterActive_Pictures;
            this.settings.isFilterActive_NotRewarded = settings.isFilterActive_NotRewarded;
            this.settings.maxDays_Weekly = settings_parseInt(settings.maxDays_Weekly, Settings.DefaultMaxDays_Weekly, 1, 7);
            this.settings.maxDays_Monthly = settings_parseInt(settings.maxDays_Monthly, Settings.DefaultMaxDays_Monthly, 7, 100);
            this.settings.minRusLetters = settings_parseInt(settings.minRusLetters, Settings.DefaultMinRusLetters, 0, 1000000);
            this.settings.postViewer = settings.postViewer ? settings.postViewer : Settings.DefaultPostViewer;
            this.settings.judges = settings_parseStringArray(settings.judges, Settings.DefaultJudges);
        } catch (ex) {
            console.log("Could not load settings.");
            console.error(ex);
        }
    }

    saveSettings(): void {
        const settingsString = JSON.stringify(this.settings);
        try {
            localStorage.setItem(LocalStorageKey, settingsString);
        } catch {
            console.error("Could not save settings.");
        }
    }

    private scrollListener = debounce(() => {
        const el = window.document.getElementById('posts_list');
        if (!el) return;
        const scrollTop =
            window.pageYOffset !== undefined
                ? window.pageYOffset
                : (
                      document.documentElement ||
                      document.body.parentNode ||
                      document.body
                  ).scrollTop;
        if (topPosition(el) + el.offsetHeight - scrollTop - window.innerHeight < 10) {
            // console.log("loadMore");
            this.loadMore();
            // const { loadMore, posts, category } = this.props;
            // if (loadMore && posts && posts.size)
            //     loadMore(posts.last(), category);
        }
        // Detect if we're in mobile mode (renders larger preview imgs)
        // const mq = window.matchMedia('screen and (max-width: 39.9375em)');
        // if (mq.matches) {
        //     this.setState({ thumbSize: 'mobile' });
        // } else {
        //     this.setState({ thumbSize: 'desktop' });
        // }
    }, 150);

    private attachScrollListener() {
        window.addEventListener('scroll', this.scrollListener, {
            capture: false,
            passive: true,
        });
        window.addEventListener('resize', this.scrollListener, {
            capture: false,
            passive: true,
        });
        this.scrollListener();
    }

    private detachScrollListener() {
        window.removeEventListener('scroll', this.scrollListener);
        window.removeEventListener('resize', this.scrollListener);
    }
}
