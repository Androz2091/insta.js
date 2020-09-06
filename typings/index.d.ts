declare module 'insta.js' {
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
        public fetchChat(chatID: string, force: false): Promise<Chat>;
        public fetchUser(query: string, force: false): Promise<User>;
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
        public typing: Boolean;
        public _disableTypingOnSend: Boolean | null | undefined;
        public _stopTypingTimeout: NodeJS.Timeout | null;
        public _keepTypingAliveInterval: NodeJS.Timeout | null;
        public _sentMessagesPromises: Collection<>;
        public readonly threadEntity: DirectThreadEntity;
        public adminUserIDs: string[] | null;
        public lastActivityAt: number | null;
        public muted: Boolean | null;
        public isPin: Boolean | null;
        public named: Boolean | null;
        public name: string | null;
        public pending: string | null;
        public isGroup: Boolean | null;
        public type: Boolean | null;
        public calling: Boolean | null;

        public _patch(data: ChatData): void;
        public approve(): Promise<void>;
        public markMessageSeen(messageID: string): void;
        public deleteMessage(messageID: string): void;
        public _keepTypingAlive(): void;
        public startTyping({} = {duration: 10000, disableOnSend: true}): Promise<void>;
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
        constructor(client: Client, threadID: string, data: MessageData);

        public client: Client;
        public id: string;
        public chatID: string;
        public type: 'text' | 'media' | 'voice_media' | 'story_share';
        public timestamp: number;
        public authorID: string;
        public content: ?string;
        public storyShareData: {
            author: User | null;
            sourceURL: string | null;
        } | undefined;
        public mediaData: {
            isLiked: Boolean;
            isAnimated: Boolean;
            isSticker: Boolean;
            url: ?string;
        };
        public voiceData: {
            duration: number;
            sourceURL: string;
        } | undefined;
        public likes: {userID: string; timestamp: number}[] | [];
        public readonly chat: Chat;
        public readonly author: User;

        public _patch(data: MessageData): void;
        public createMessageCollector(options: MessageCollectorOptions): MessageCollector;
        public markSeen(): Promise<void>;
        public delete(): Promise<void>;
        public reply(content: string): Promise<Message>;
        public toString(): ?string;
        public toJSON(): MessageJSON;
    }

    class MessageCollector extends EventEmitter {
        constructor(chat: Chat, {filter: Function, idle: number});

        public client: Client;
        public chat: Chat;
        public filter: Function;
        public idle: number;
        public ended: Boolean;
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
        public isPrivate: Boolean;
        public isVerified: Boolean;
        public isBusiness: Boolean;
        public avatarURL: string;
        public biography: ?string;
        public mediaCount: ?number;
        public followerCount: ?number;
        public followerCount: ?number;
        public totalIgtvVideos: ?number;
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
        public 
    }

    class Util {
        static public parseMessagePath(url: string): {threadID: string; itemID: string};
        static public isID(query: string): Boolean;
        static public matchAdminPath(query: string, extract: false): string | Boolean;
        static public matchMessagePath(query: string, extract: false): string | Boolean;
        static public matchInboxPath(query: string, extract: false): string | Boolean;
        static public isMessageValid(message: Message): Boolean;
    }

    interface ClientOptions {

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
        muted: Boolean | null;
        isPin: Boolean | null;
        named: Boolean | null;
        pending: Boolean | null;
        isGroup: Boolean | null;
        calling: Boolean | null;
        users: string[];
        messages: string[];
    }

    interface ClientUserJSON extends UserJSON {
        allowContactsSync: Boolean;
        phoneNumber: string;
    }

    interface MessageJSON {
        client: ClientJSON;
        chatID: string;
        type: 'text' | 'media' | 'voice_media' | 'story_share';
        timestamp: number;
        authorID: string;
        content: string;
        mediaData: {
            isLiked: Boolean;
            isAnimated: Boolean;
            isSticker: Boolean;
            url: ?string;
        };
        voiceData: {
            duration: number;
            sourceURL: string;
        } | undefined;
        storyShareDate: {
            author: User | null;
            sourceURL: string | null;
        } | undefined;
        likes: {userID: string; timestamp: number}[] | [];
    }

    interface MessageCollectorJSON {
        client: ClientJSON;
        chatID: string;
        ended: Boolean;
    }

    interface UserJSON {
        client: ClientJSON;
        username: string;
        fullname: string;
        isPrivate: Boolean;
        isVerified: Boolean;
        isBusiness: Boolean;
        avatarURL: string;
        biography: ?string;
        mediaCount: ?number;
        followerCount: ?number;
        followersCount: ?number;
        followers: string[];
        following: string[];
        totalIgtvVideos: ?number;
    }

    interface ChatData {
        admin_user_ids: string[];
        lastActivityAt: number;
        muted: Boolean;
        isPin: Boolean;
        named: Boolean;
        name: string;
        pending: Boolean;
        isGroup: Boolean;
        type: Boolean;
        calling: Boolean;
    }

    interface ClientUserData {
        allowContactsSync: Boolean;
        phoneNumber: string;
    }

    interface MessageData {
        item_id: string;
        item_type: 'text' | 'media' | 'voice_media' | 'story_share';
        timestamp: number;
        user_id: string;
        text: string;
        link: {text: string};
        story_share: {
            message: 'No longer available' | string
            media: {
                user: UserRepositoryInfoResponseUser
                image_versions2: {
                    condidates: {url: string}[];
                };
            };
        };
        animated_media: {
            is_sticker: Boolean;
            fixed_height: {
                url: ?Boolean;
            };
        };
        voice_media: {
            media: {
                audio: {
                    duration: number;
                    sourceURL: string;
                };
            };
        };
    };

    interface UserData {
        pk: string;
        username: string;
        fullName: string;
        isPrivate: Boolean;
        isVerified: Boolean;
        isBusiness: Boolean;
        avatarURL: string;
        biography: ?string;
        mediaCount: ?number;
        followerCount: ?number;
        followingCount: ?number;
        totalIgtvVideos: ?number;
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