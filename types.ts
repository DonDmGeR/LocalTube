

export interface Video {
    id: string;
    // FIX: Made handle optional as videos from file inputs or imports don't have one initially.
    handle?: FileSystemFileHandle;
    filePath: string[];
    thumbnail: string;
    name: string;
    duration: number; // in seconds
    size: number; // in bytes
    resolution: {
        width: number;
        height: number;
    };
    tags: string[];
    isFavorite: boolean;
    rating: number; // 0-5 stars
    codec?: string;
    bitrate?: number; // in bits per second
    frameRate?: number;
    dateAdded: number; // timestamp
    lastPlayedPosition?: number; // in seconds
    comments: string; // User-added notes
    transcript?: string; // Text content of a transcript file
    description: string; // User-added description
}

export interface Playlist {
    id: string;
    name: string;
    videoIds: string[];
}

export interface LibraryFolder {
    id: string;
    name: string;
    handle: FileSystemDirectoryHandle;
}

export type SmartPlaylistId = 'recently-added' | 'top-rated' | 'short-clips';

export type Filter =
    | { type: 'all' }
    | { type: 'favorites' }
    | { type: 'playlist'; id: string }
    | { type: 'tag'; tag: string }
    | { type: 'smart'; id: SmartPlaylistId };

export type View = 'grid' | 'list';