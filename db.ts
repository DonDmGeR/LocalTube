import Dexie, { type Table } from 'dexie';
import { Video, Playlist, LibraryFolder } from './types';

export class LocalTubeDB extends Dexie {
    videos!: Table<Video>;
    playlists!: Table<Playlist>;
    libraryFolders!: Table<LibraryFolder>;

    constructor() {
        super('LocalTubeDB');
        // The highest version must be declared first
        (this as Dexie).version(4).stores({
            videos: '++id, name, dateAdded, rating',
            playlists: '++id, name',
            libraryFolders: '++id, name'
        });

        (this as Dexie).version(3).stores({
            videos: '++id, name, dateAdded',
            playlists: '++id, name',
            libraryFolders: '++id, name' // New table for root folder handles
        });

        // Previous version for migration path
        (this as Dexie).version(2).stores({
            videos: '++id, name, dateAdded', // Primary key 'id' and indexes
            playlists: '++id, name'
        });
    }
}

export const db = new LocalTubeDB();

// Video Functions
export const getAllVideos = () => db.videos.toArray();
export const addVideos = (videos: Video[]) => db.videos.bulkAdd(videos);
export const updateVideo = (video: Video) => db.videos.put(video);
export const deleteVideo = (id: string) => db.videos.delete(id);
export const deleteVideos = (ids: string[]) => db.videos.bulkDelete(ids);

// Playlist Functions
export const getAllPlaylists = () => db.playlists.toArray();
export const savePlaylist = (playlist: Playlist) => db.playlists.put(playlist);
export const deletePlaylist = (id: string) => db.playlists.delete(id);

// Library Folder Functions
export const getAllLibraryFolders = () => db.libraryFolders.toArray();
export const addLibraryFolder = (folder: LibraryFolder) => db.libraryFolders.put(folder);
export const deleteLibraryFolder = (id: string) => db.libraryFolders.delete(id);