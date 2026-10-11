// The published type surface of mixt.js.
//
// This is the only hand-written declaration file in the package: it names what
// the SDK exports and nothing more. Every type it re-exports is generated from
// the JSDoc in `src/` by `npm run build:types` — edit the JSDoc, not `types/`.

import type { Mixt } from './types/index.js';

export type { Mixt };
export { mixt, default } from './types/index.js';

declare global {
    interface Window {
        mixt: Mixt;
    }
}

// -- Shared --
export type {
    APILoggingConfig,
    ListPage,
    ListPaginationOptions,
    ListStreamOptions,
    PaginatedResult,
    PaginationOptions,
    MixtEnvironment,
    RequestCallbacks,
    UpgradeReason,
    UpgradeRequestDetails,
} from './types/lib/types.js';
export type { default as APICallLogger } from './types/lib/APICallLogger.js';

// -- mixt.apps --
export type {
    App,
    AppListOptions,
    AppUser,
    CheckAppNameResult,
    CreateAppOptions,
    CreateAppResult,
    GetUsersOptions,
    UpdateAppAttributes,
} from './types/modules/apps/types.js';

// -- mixt.auth --
export type {
    AllowanceInfo,
    APIUsage,
    AppUsage,
    DetailedAppUsage,
    MonthlyUsage,
    SignInResult,
    User,
    UserProfile,
    UserProfilePatch,
} from './types/modules/Auth.js';

// -- mixt.debug --
export type { Debug } from './types/modules/Debug.js';

// -- mixt.drivers --
export type { Driver } from './types/modules/Drivers.js';

// -- mixt.email --
export type {
    EmailAddress,
    EmailFolder,
    EmailGetOptions,
    EmailHeader,
    EmailListOptions,
    EmailListStreamOptions,
    EmailMessage,
    EmailMessageAttachment,
    EmailSummary,
} from './types/modules/Email/types.js';

// -- mixt.events --
export type {
    DestroyedEventsWorker,
    EventAnchor,
    EventDelivery,
    EventFetchOptions,
    EventFetchPage,
    EventGapMarker,
    EventHandler,
    EventsWorkerPage,
    EventsWorkerSummary,
    EventsWorkersListOptions,
    HandlerOptions,
    HandlerPublication,
    HandlerSummary,
    OnLocalOptions,
    OnPersistentOptions,
    PersistentSubscription,
    PublishedHandler,
    MixtEvent,
    MixtKvEvent,
    MixtNotifEvent,
} from './types/modules/events/types.js';
export type { EventSubscription } from './types/modules/events/lib/subscription.js';
export type { EventHandlers } from './types/modules/events/lib/handlers.js';
export type { EventsWorkers } from './types/modules/events/lib/workers.js';

// -- mixt.fs --
export type {
    CopyOptions,
    DeleteOptions,
    FSItemRead,
    FSItemWithShares,
    GetShareLinkOptions,
    GetSharesOptions,
    ListSharedByMeOptions,
    ListSharedOptions,
    MkdirOptions,
    MoveOptions,
    ReadOptions,
    ReaddirOptions,
    RenameOptions,
    Share,
    ShareMode,
    ShareOptions,
    SharePage,
    ShareRecipient,
    SignResult,
    SpaceInfo,
    StatOptions,
    UnshareOptions,
    UploadBatchError,
    UploadItems,
    UploadOperationResult,
    UploadOptions,
    ThumbnailGenerator,
    ThumbnailGeneratorContext,
    WriteOptions,
} from './types/modules/FileSystem/types.js';
export type {
    FileSignatureInfo,
    FSItem,
    InternalFSProperties,
} from './types/modules/FSItem.js';

// -- mixt.hosting --
export type { Subdomain } from './types/modules/hosting/types.js';

// -- mixt.kv --
export type {
    KVAddPath,
    KVIncrementPath,
    KVListOptions,
    KVListPage,
    KVListPaginationOptions,
    KVListStreamOptions,
    KVOptConfig,
    KVPair,
    KVScalar,
    KVSetBatch,
    KVSetItem,
    KVSetObject,
    KVUpdateObject,
    KVUpdatePath,
    KVValue,
} from './types/modules/kv/types.js';

// -- mixt.net --
export type { Networking, SocketEvent } from './types/modules/networking/types.js';
export type { PSocket } from './types/modules/networking/PSocket.js';
export type { PTLSSocket } from './types/modules/networking/PTLS.js';

// -- mixt.os --

// -- mixt.peer --
export type {
    MixtPeerDescription,
    MixtPeerIceCandidate,
    MixtPeerMessage,
    MixtPeerOptions,
    MixtPeerUser,
} from './types/modules/Peer/types.js';
export type { MixtPeerConnection } from './types/modules/Peer/MixtPeerConnection.js';
export type { MixtPeerServer } from './types/modules/Peer/MixtPeerServer.js';
export type {
    MixtPeerEncoding,
    MixtPeerPublishOptions,
} from './types/modules/Peer/tracks.js';
export type {
    MixtPeerConnectionCloseEvent,
    MixtPeerConnectionErrorEvent,
    MixtPeerConnectionEventMap,
    MixtPeerConnectionMessageEvent,
    MixtPeerConnectionOpenEvent,
    MixtPeerLinkState,
    MixtPeerLinkStateEvent,
    MixtPeerMediaEndedEvent,
    MixtPeerMediaEvent,
    MixtPeerServerConnectionEvent,
    MixtPeerServerEventMap,
    MixtPeerServerReconnectEvent,
} from './types/modules/Peer/events.js';

// -- mixt.perms --
export type {
    AppDataClass,
    AppDataFsScope,
    AppDataKvScope,
    AppDataScopePair,
    AppDataScopes,
    AppDataStore,
    PermsAccess,
    PermsAccessRequest,
    PermsAppDataRequest,
    PermsAppRootDirRequest,
    PermsBatchEntry,
    PermsCreateKind,
    PermsFolderName,
    PermsFolderRequest,
    PermsPermissionRequest,
    PermsRequestDetails,
    PermsResource,
} from './types/modules/perms/types.js';

// -- mixt.teams --
export type {
    CreateMemberOptions,
    CreateTeamOptions,
    Team,
    TeamAuditEntry,
    TeamMember,
    TemporaryCredential,
    UpdateTeamAttributes,
} from './types/modules/teams/types.js';

// -- mixt.ui --
export type { AppConnection } from './types/modules/UI.js';
export type {
    AlertButton,
    AlertOptions,
    AppConnectionCloseEvent,
    CancelAwarePromise,
    ColorPickerOptions,
    ConnectionEvent,
    ContextMenuItem,
    ContextMenuOptions,
    DirectoryPickerOptions,
    FilePickerOptions,
    FontPickerOptions,
    LaunchAppOptions,
    LaunchAppResult,
    MenuItem,
    MenubarOptions,
    NotificationOptions,
    PromptOptions,
    ThemeData,
    WindowHandle,
    WindowIdentifier,
    WindowOptions,
} from './types/modules/UI.js';

// -- mixt.util --
export type { default as Util, UtilRPC } from './types/modules/Util.js';

// -- mixt.workers --
export type {
    WorkerDeployment,
    WorkerInfo,
} from './types/modules/Workers.js';

// -- Module instance types --
//
// Each `mixt.<module>` handle. Named here rather than re-exported, because the
// generated modules export a constructor value plus its constructor type, and
// what a consumer annotates with is the instance.

export type Apps = InstanceType<import('./types/modules/apps/index.js').AppsConstructor>;
export type Auth = InstanceType<import('./types/modules/Auth.js').AuthConstructor>;
export type Drivers = InstanceType<import('./types/modules/Drivers.js').DriversConstructor>;
export type Email = InstanceType<import('./types/modules/Email/Email.js').EmailConstructor>;
export type Events = InstanceType<import('./types/modules/events/index.js').EventsConstructor>;
export type FS = InstanceType<import('./types/modules/FileSystem/index.js').FSConstructor>;
export type Hosting = InstanceType<import('./types/modules/hosting/index.js').HostingConstructor>;
export type KV = InstanceType<import('./types/modules/kv/index.js').KVConstructor>;
export type OS = InstanceType<import('./types/modules/os/index.js').OSConstructor>;
export type Peer = InstanceType<import('./types/modules/Peer/index.js').PeerConstructor>;
export type Perms = InstanceType<import('./types/modules/perms/index.js').PermsConstructor>;
export type Teams = InstanceType<import('./types/modules/teams/index.js').TeamsConstructor>;
export type UI = InstanceType<import('./types/modules/UI.js').UIConstructor>;
export type WorkersHandler = InstanceType<import('./types/modules/Workers.js').WorkersConstructor>;
