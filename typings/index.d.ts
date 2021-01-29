declare module '@androz2091/insta.js' {
    import ipa, { DirectThreadEntity, UserRepositoryInfoResponseUser } from 'instagram-private-api';
    import { EventEmitter } from 'events';
    import { Collection } from '@discordjs/collection';
    import { Topic } from 'instagram_mqtt/dist/topic';
    import { ParsedMessage } from 'instagram_mqtt/dist/realtime/parsers';
    import { FbnsNotificationUnknown } from 'instagram_mqtt';

    export class Client extends EventEmitter {
        constructor(options: ClientOptions);

        public user: User | null;
        public ig: ipa.IgApiClient | null;
        public ready: boolean;
        public options: ClientOptions;
        public cache: Cache
        public eventsToReplay: any[][]

        private _pathOrCreateUser(userID: string, userPayload: ipa.UserRepositoryInfoResponseUser): User;
        private handleRealtimeReceive(topic: Topic, messages?: ParsedMessage<any>[]): void;
        private handleFbnsReceive(data: FbnsNotificationUnknown): void;
        
        public createChat(userIDs: string[]): Promise<Chat>;
        public fetchChat(chatID: string, force: boolean): Promise<Chat>;
        public fetchUser(query: string, force: boolean): Promise<User>;
        public logout(): void;
        public login(username: string, password: string, state: object): void;
        public toJSON(): ClientJSON;

        public on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        public on<K extends string | symbol>(
            event: Exclude<S, keyof ClientEvents>,
            listener: (...args: any[]) => void,
        ): this;

        public once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        public once<K extends string | symbol>(
            event: Exclude<S, keyof ClientEvents>,
            listener: (...args: any[]) => void,
        ): this;

        public off<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        public off<K extends string | symbol>(
            event: Exclude<S, keyof ClientEvents>,
            listener: (...args: any[]) => void,
        ): this;

        public emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
        public emit<S extends string | symbol>(event: Exclude<S, keyof ClientEvents>, ...args: any[]): boolean;

        public removeAllListeners<K extends keyof ClientEvents>(event?: K): this;
        public removeAllListeners<S extends string | symbol>(event?: Exclude<S, keyof ClientEvents>): this;
    }

    class Attachment {
        constructor(data: string | Buffer);

        public data: string | Buffer;
        public file: Buffer;

        private _verify(): Promise<void>;
        
        public _handleFile(file: string): Promise<void>;
        public _handleBuffer(data: Buffer): Promise<void>;
        public _handleURL(link: string): Promise<void>;
    }

    class Chat {
        constructor(client: Client, threadID: string, data: ChatData);
        
        public client: Client;
        public id: string;
        public messages: Collection<string, Message>;
        public users: Collection<string, User>;
        public leftUsers: Collection<string, User>;
        public typing: boolean;
        public _disableTypingOnSend: boolean | null | undefined;
        public _stopTypingTimeout: NodeJS.Timeout | null;
        public _keepTypingAliveInterval: NodeJS.Timeout | null;
        public _sentMessagesPromises: Collection<>;
        public readonly threadEntity: DirectThreadEntity;
        public adminUserIDs: string[] | null;
        public lastActivityAt: number | null;
        public muted: boolean | null;
        public isPin: boolean | null;
        public named: boolean | null;
        public name: string | null;
        public pending: string | null;
        public isGroup: boolean | null;
        public type: boolean | null;
        public calling: boolean | null;

        public _patch(data: ChatData): void;
        public approve(): Promise<void>;
        public markMessageSeen(messageID: string): void;
        public deleteMessage(messageID: string): void;
        public _keepTypingAlive(): void;
        public startTyping(options: StartTypingOptions): Promise<void>;
        public stopTyping(): Promise<void>;
        public sendMessage(content: string, options: any): Promise<Message>;
        public sendVoice(buffer: Buffer): Promise<Message>;
        public sendPhoto(attachment: string | Buffer | Attachment): Promise<Message>;
        public toJSON(): ChatJSON;
    }

    class ClientUser extends User {
        constructor(client: Client, data: ClientUserData);

        public allowContactsSync
        public readonly follow(): undefined;
        public readonly unfollow(): undefined;
        public readonly block(): undefined;
        public readonly unblock(): undefined;
        public readonly approveFollow(): undefined;
        public readonly denyFollow(): undefined;
        public readonly removeFollow(): undefined;
        public readonly send(): undefined;

        public _patch(data: ClientUserData): void;
        public setBiography(content: string): Promise<string>;
        public toJSON(): ClientUserJSON;
    };

    class Message {
        constructor(client: Client, threadID: string, data: object);

        public client: Client;
        public id: string;
        public chatID: string;
        public type: 'text' | 'media' | 'voice_media' | 'story_share';
        public timestamp: number;
        public authorID: string;
        public content?: string;
        public storyShareData: {
            author: User | null;
            sourceURL: string | null;
        } | undefined;
        public mediaData: {
            isLiked: boolean;
            isAnimated: boolean;
            isSticker: boolean;
            url?: string;
        };
        public voiceData: {
            duration: number;
            sourceURL: string;
        } | undefined;
        public likes: MessageLike[];
        public readonly chat: Chat;
        public readonly author: User;

        public _patch(data: object): void;
        public createMessageCollector(options: MessageCollectorOptions): MessageCollector;
        public markSeen(): Promise<void>;
        public delete(): Promise<void>;
        public reply(content: string): Promise<Message>;
        public toString(): string;
        public toJSON(): MessageJSON;
    }

    class MessageCollector extends EventEmitter {
        constructor(chat: Chat, {filter: Function, idle: number});

        public client: Client;
        public chat: Chat;
        public filter: Function;
        public idle: number;
        public ended: boolean;
        public handleMessage: Promise<void>;

        public handleMessage(MessageCollector: Message): Promise<void>;
        public end(reason: string): Promise<void>;
        public toJSON(): MessageCollectorJSON;

        public on<K extends keyof MessageCollectorEvents>(event: K, listener: (...args: MessageCollectorEvents[K]) => void): this;
        public on<K extends string | symbol>(
            event: Exclude<S, keyof MessageCollectorEvents>,
            listener: (...args: any[]) => void,
        ): this;

        public once<K extends keyof MessageCollectorEvents>(event: K, listener: (...args: MessageCollectorEvents[K]) => void): this;
        public once<K extends string | symbol>(
            event: Exclude<S, keyof MessageCollectorEvents>,
            listener: (...args: any[]) => void,
        ): this;

        public off<K extends keyof MessageCollectorEvents>(event: K, listener: (...args: MessageCollectorEvents[K]) => void): this;
        public off<K extends string | symbol>(
            event: Exclude<S, keyof MessageCollectorEvents>,
            listener: (...args: any[]) => void,
        ): this;

        public emit<K extends keyof MessageCollectorEvents>(event: K, ...args: MessageCollectorEvents[K]): boolean;
        public emit<S extends string | symbol>(event: Exclude<S, keyof MessageCollectorEvents>, ...args: any[]): boolean;

        public removeAllListeners<K extends keyof MessageCollectorEvents>(event?: K): this;
        public removeAllListeners<S extends string | symbol>(event?: Exclude<S, keyof MessageCollectorEvents>): this;
    }

    class User {
        constructor(client: Client, data: UserData);

        public client: Client;
        public id: string;
        public followers: Collection<string, User>;
        public following: Collection<string, User>;
        public username: string;
        public fullname: string;
        public isPrivate: boolean;
        public isVerified: boolean;
        public isBusiness: boolean;
        public avatarURL: string;
        public biography?: string;
        public mediaCount?: number;
        public followerCount?: number;
        public followerCount?: number;
        public totalIgtvVideos?: number;
        public readonly privateChat: Chat;
        
        public _patch(data: UserData): void;
        public fetch(): Promise<User>;
        public fetchPrivateChat(): Promise<Chat>;
        public fetchFollowers(): Promise<Collection<string, User>>;
        public fetchFollowing(): Promise<Collection<string, User>>;
        public follow(): Promise<void>;
        public unfollow(): Promise<void>;
        public block(): Promise<void>;
        public unblock(): Promise<void>;
        public approveFollow(): Promise<void>;
        public denyFollow(): Promise<void>;
        public removeFollower(): Promise<void>;
        public send(content: string): Promise<Message>;
        public toString(): string;
    }

    class Util {
        public static isID(query: string): boolean;
        public static matchAdminPath(query: string, extract: boolean): string[] | boolean;
        public static matchMessagePath(query: string, extract: boolean): string[] | boolean;
        public static matchInboxPath(query: string, extract: boolean): string[] | boolean;
        public static isMessageValid(message: Message): boolean;
    }

    interface StartTypingOptions {
        duration: number;
        disableOnSend: boolean;
    }

    interface ClientOptions {
        disableReplyPrefix: boolean;
    }

    interface Cache {
        messages: Collection<string, Message>;
        users: Collection<string, User>;
        chats: Collection<string, Chat>;
        pendingChats: Collection<string, Chat>;
    }

    interface ClientJSON {
        ready: boolean,
        options: ClientOptions,
        id: string
    }

    interface ChatJSON {
        client: ClientJSON;
        adminUserIDs: string | null;
        lastActivityAt: number | null;
        muted: boolean | null;
        isPin: boolean | null;
        named: boolean | null;
        pending: boolean | null;
        isGroup: boolean | null;
        calling: boolean | null;
        users: string[];
        messages: string[];
    }

    interface ClientUserJSON extends UserJSON {
        allowContactsSync: boolean;
        phoneNumber: string;
    }

    interface MessageLike {
        userID: string;
        timestamp: string;
    }

    interface MessageJSON {
        client: ClientJSON;
        chatID: string;
        type: 'text' | 'media' | 'voice_media' | 'story_share';
        timestamp: number;
        authorID: string;
        content: string;
        mediaData: {
            isLiked: boolean;
            isAnimated: boolean;
            isSticker: boolean;
            url?: string;
        };
        voiceData: {
            duration: number;
            sourceURL: string;
        } | undefined;
        storyShareData: {
            author: User | null;
            sourceURL: string | null;
        } | undefined;
        likes: MessageLike[];
    }

    interface MessageCollectorJSON {
        client: ClientJSON;
        chatID: string;
        ended: boolean;
    }

    interface UserJSON {
        client: ClientJSON;
        username: string;
        fullname: string;
        isPrivate: boolean;
        isVerified: boolean;
        isBusiness: boolean;
        avatarURL: string;
        biography?: string;
        mediaCount?: number;
        followerCount?: number;
        followersCount?: number;
        followers?: string[];
        following?: string[];
        totalIgtvVideos?: number;
    }

    interface ChatData {
        admin_user_ids: string[];
        lastActivityAt: number;
        muted: boolean;
        isPin: boolean;
        named: boolean;
        name: string;
        pending: boolean;
        isGroup: boolean;
        type: boolean;
        calling: boolean;
    }

    interface ClientUserData {
        allowContactsSync: boolean;
        phoneNumber: string;
    }

    interface UserData {
        pk: string;
        username: string;
        fullName: string;
        isPrivate: boolean;
        isVerified: boolean;
        isBusiness: boolean;
        avatarURL: string;
        biography?: string;
        mediaCount?: number;
        followerCount?: number;
        followingCount?: number;
        totalIgtvVideos?: number;
    }

    interface ClientEvents {
        rawRealtime: [Topic, ParsedMessage<any>[]];
        chatNameUpdate: [Chat, string, string];
        chatUserAdd: [Chat, User];
        chatUserRemove: [Chat, User];
        callStart: [Chat];
        callEnd: [Chat];
        likeRemove: [User, Message];
        likeAdd: [User, Message];
        chatAdminAdd: [User, User];
        messageCreate: [Message];
        chatAdminRemove: [Chat, User];
        messageDelete: [Message | undefined];
        rawFbns: [FbnsNotificationUnknown];
        newFollower: [User];
        followRequest: [User];
        pendingRequest: [Chat];
        debug: [string, any];
        connected: [];
    }

    interface MessageCollectorEvents {
        message: [Message];
        end: [Message];
    }

    //#endregion
}