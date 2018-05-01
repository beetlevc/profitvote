﻿import * as steem from 'steem'

const MaxRetries: number = 3;

async function retry(f: ()=>Promise<any>): Promise<any> {
    let currentTry: number = 1;
    while (true) {
        try {
            return await f();
        } catch (ex) {
            if (currentTry >= MaxRetries) {
                throw ex;
            } else {
                console.warn(ex);
                console.warn(`Retry ${currentTry}...`);
            }
        }
        currentTry++;
    }
}

export async function getFeedFirstEntryAsync(blog: string): Promise<steem.ShortFeedEntry | null> {
    return await retry(async () => {
        const result = await steem.api.getFeedEntriesAsync(blog, 0, 1);
        if (result && result.length)
            return result[0];
        else
            return null;
    });
}

export async function getDiscussionsByFeedAsync(blog: string, limit: number, startAuthor: string, startPermlink: string): Promise<steem.Post[]> {
    return await retry(async () => {
        // if (Math.random() > 0.8)
        //     throw new Error("Test error.");
        const query: steem.DiscussionQuery = {
            tag: blog,
            limit: limit,
            start_author: startAuthor,
            start_permlink: startPermlink,
        };
        return await steem.api.getDiscussionsByFeedAsync(query);
    });
}

export async function getDiscussionsByCreatedAsync(tag: string, limit: number, startAuthor: string, startPermlink: string): Promise<steem.Post[]> {
    return await retry(async () => {
        // if (Math.random() > 0.8)
        //     throw new Error("Test error.");
        const query: steem.DiscussionQuery = {
            tag: tag,
            limit: limit,
            start_author: startAuthor ? startAuthor : undefined,
            start_permlink: startPermlink ? startPermlink : startPermlink,
        };
        return await steem.api.getDiscussionsByCreatedAsync(query);
    });
}

export async function getDynamicGlobalPropertiesAsync(): Promise<steem.GlobalProperties> {
    return await retry(async () => {
        return await steem.api.getDynamicGlobalPropertiesAsync();
    });
}

export async function getAccountsAsync(names: string[]): Promise<steem.Account[]> {
    return await retry(async () => {
        return await steem.api.getAccountsAsync(names);
    });
}

export async function getAccountVotesAsync(voter: string): Promise<steem.AccountVote[]> {
    return await retry(async () => {
        return await steem.api.getAccountVotesAsync(voter);
    });
}

export async function getContentAsync(author: string, permlink: string): Promise<steem.Post> {
    return await retry(async () => {
        return await steem.api.getContentAsync(author, permlink);
    });
}