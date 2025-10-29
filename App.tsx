


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Video, Playlist, Filter, LibraryFolder, SmartPlaylistId, View } from './types';
import Sidebar from './components/Sidebar';
import VideoGrid from './components/VideoGrid';
import VideoInfoPanel from './components/VideoInfoPanel';
import { processVideoFile, processVideoHandle } from './utils/videoProcessor';
import { PlusIcon, ArrowLeftIcon, DoubleArrowLeftIcon, FolderIcon, CogIcon, SyncIcon, DuplicateIcon, UploadIcon, DownloadIcon, ChevronDownIcon, ChevronUpIcon, ClosedCaptionIcon, GridIcon, ListIcon } from './components/Icons';
import VideoCard from './components/VideoCard';
import DuplicateFinderModal from './components/DuplicateFinderModal';
import * as db from './db';
import VideoList from './components/VideoList';

// FIX: Add global type definitions for the File System Access API.
// These types are not yet part of the standard TypeScript DOM library.
declare global {
  interface FileSystemHandle {
    // FIX: Add readonly modifier to match DOM lib definitions.
    readonly kind: 'file' | 'directory';
    // FIX: Add readonly modifier to match DOM lib definitions.
    readonly name: string;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    // FIX: Add readonly modifier to match DOM lib definitions.
    readonly kind: 'file';
    getFile(): Promise<File>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    // FIX: Add readonly modifier to match DOM lib definitions.
    readonly kind: 'directory';
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  }

  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}


type SortOrder = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'duration-asc' | 'duration-desc' | 'rating-desc' | 'rating-asc';

// UI Design System Classes
const buttonClasses = {
    base: 'font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 border',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 hover:border-blue-600 focus:ring-blue-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 focus:ring-blue-500',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-700 hover:border-green-600 focus:ring-green-500',
};
const inputClasses = 'w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const SMART_PLAYLISTS: Record<SmartPlaylistId, { name: string, rule: (video: Video) => boolean }> = {
    'recently-added': { name: 'Recently Added', rule: (v) => v.dateAdded > Date.now() - 7 * 24 * 60 * 60 * 1000 },
    'top-rated': { name: 'Top Rated', rule: (v) => v.rating >= 4 },
    'short-clips': { name: 'Short Clips', rule: (v) => v.duration < 300 }, // under 5 minutes
};

const App: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>({ type: 'all' });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');
    const [viewMode, setViewMode] = useState<View>('grid');
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Loading library...');
    const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
    const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [isDuplicateFinderOpen, setIsDuplicateFinderOpen] = useState(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
    const [areSubtitlesVisible, setAreSubtitlesVisible] = useState(true);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const toolsMenuRef = useRef<HTMLDivElement>(null);
    const lastPlayedPositionRef = useRef<number>(0);
    const previousVideoIdRef = useRef<string | null>(null);

    // Load initial data from IndexedDB
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [dbVideos, dbPlaylists] = await Promise.all([db.getAllVideos(), db.getAllPlaylists()]);
                setVideos(dbVideos);
                setPlaylists(dbPlaylists);
            } catch (error) {
                console.error("Failed to load data from IndexedDB", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);
    
    // Effect to close Tools dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
                setIsToolsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Effect to generate and manage video object URLs
    useEffect(() => {
        let objectUrl: string | null = null;
        
        const generateUrl = async () => {
            const video = videos.find(v => v.id === selectedVideoId);
            if (video?.handle) {
                try {
                    const file = await video.handle.getFile();
                    objectUrl = URL.createObjectURL(file);
                    setCurrentVideoUrl(objectUrl);
                } catch (error) {
                    console.error("Error creating object URL:", error);
                     if ((error as DOMException).name === 'NotFoundError') {
                        alert("Could not access video file. It may have been moved or deleted. Please run a library rescan to fix this.");
                     } else {
                        alert("Could not access video file. Please grant permission again by re-adding the library folder.");
                     }
                    setCurrentVideoUrl(null);
                }
            } else {
                setCurrentVideoUrl(null);
            }
        };

        generateUrl();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [selectedVideoId, videos]);
    
    const selectedVideo = useMemo(() => {
        if (!selectedVideoId) return null;
        return videos.find(v => v.id === selectedVideoId) || null;
    }, [selectedVideoId, videos]);

    // Effect to generate and manage transcript object URL for subtitles
    useEffect(() => {
        if (selectedVideo?.transcript) {
            const blob = new Blob([selectedVideo.transcript], { type: 'text/vtt' });
            const url = URL.createObjectURL(blob);
            setTranscriptUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setTranscriptUrl(null);
        }
    }, [selectedVideo?.id, selectedVideo?.transcript]);

    // Effect to programmatically control subtitle visibility
    useEffect(() => {
        const video = videoRef.current;
        if (!video || typeof video.textTracks === 'undefined') return;

        const setTextTrackMode = () => {
            if (video.textTracks.length > 0) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    if (video.textTracks[i].kind === 'subtitles') {
                        video.textTracks[i].mode = areSubtitlesVisible ? 'showing' : 'hidden';
                    }
                }
            }
        };
        
        video.textTracks.addEventListener('addtrack', setTextTrackMode);
        setTextTrackMode();

        return () => {
            if (video && video.textTracks) {
                video.textTracks.removeEventListener('addtrack', setTextTrackMode);
            }
        };
    }, [areSubtitlesVisible, currentVideoUrl]);

    const updateVideo = useCallback(async (updatedVideo: Video) => {
        setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
        await db.updateVideo(updatedVideo);
    }, []);
    
    // Save last played position when selected video changes
    useEffect(() => {
        const saveLastPosition = async () => {
            if (previousVideoIdRef.current && lastPlayedPositionRef.current > 0) {
                const videoToUpdate = videos.find(v => v.id === previousVideoIdRef.current);
                if (videoToUpdate && videoToUpdate.duration > 0) {
                    // If closed within 5 seconds of the end, mark as watched (position 0).
                    const newPosition = (videoToUpdate.duration - lastPlayedPositionRef.current < 5) ? 0 : lastPlayedPositionRef.current;
                    if (videoToUpdate.lastPlayedPosition !== newPosition) {
                        await updateVideo({ ...videoToUpdate, lastPlayedPosition: newPosition });
                    }
                }
            }
            lastPlayedPositionRef.current = 0;
        };

        if (previousVideoIdRef.current !== selectedVideoId) {
            saveLastPosition();
        }
        previousVideoIdRef.current = selectedVideoId;

    }, [selectedVideoId, videos, updateVideo]);

    const addVideosToStateAndDb = async (newVideos: Video[]) => {
        if (newVideos.length === 0) return;
        setVideos(prev => [...prev, ...newVideos]);
        await db.addVideos(newVideos);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setLoadingMessage('Processing files...');
        setIsLoading(true);

        const newVideos: Video[] = [];
        const existingNames = new Set(videos.map(v => v.name));

        // FIX: Iterate directly over FileList to ensure correct type inference for `file`.
        for (const file of files) {
            if (existingNames.has(file.name)) continue;
            try {
                const videoData = await processVideoFile(file);
                newVideos.push(videoData);
            } catch (error) {
                console.error(`Failed to process file ${file.name}:`, error);
            }
        }
        await addVideosToStateAndDb(newVideos);
        setIsLoading(false);
    };

    const handleAddFilesClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleAddLibraryFolder = async () => {
        try {
            const dirHandle = await window.showDirectoryPicker();
            setLoadingMessage('Scanning folder...');
            setIsLoading(true);

            // Save the handle for rescanning
            const newLibraryFolder: LibraryFolder = { id: crypto.randomUUID(), name: dirHandle.name, handle: dirHandle };
            await db.addLibraryFolder(newLibraryFolder);

            const newVideos: Video[] = [];
            const existingPaths = new Set(videos.map(v => v.filePath.join('/')));

            const processEntry = async (handle: FileSystemDirectoryHandle | FileSystemFileHandle, path: string[]) => {
                const currentPath = [...path, handle.name];
                if (handle.kind === 'file') {
                    if (handle.name.match(/\.(mp4|webm|mov|mkv|avi)$/i) && !existingPaths.has(currentPath.join('/'))) {
                         try {
                            const videoData = await processVideoHandle(handle, currentPath);
                            newVideos.push(videoData);
                         } catch (error) {
                            console.error(`Failed to process file ${currentPath.join('/')}:`, error);
                         }
                    }
                } else if (handle.kind === 'directory') {
                    for await (const entry of handle.values()) {
                        await processEntry(entry, currentPath);
                    }
                }
            };
            
            for await (const entry of dirHandle.values()) {
                await processEntry(entry, [dirHandle.name]);
            }

            await addVideosToStateAndDb(newVideos);

        } catch (error) {
            if ((error as DOMException).name !== 'AbortError') {
                console.error("Error picking directory:", error);
            }
        } finally {
             setIsLoading(false);
        }
    }

    const handleRescanLibrary = async () => {
        setLoadingMessage('Rescanning library for changes...');
        setIsLoading(true);
        try {
            const libraryFolders = await db.getAllLibraryFolders();
            if (libraryFolders.length === 0) {
                alert("No library folders have been added yet. Please add a folder first.");
                return;
            }

            const allDbVideos = await db.getAllVideos();
            // FIX: Explicitly type the Map to prevent 'existingVideo' from being inferred as 'unknown'.
            const existingVideoPaths: Map<string, Video> = new Map(allDbVideos.map(v => [v.filePath.join('/'), v]));
            const foundPaths = new Set<string>();
            const videosToAdd: Video[] = [];
            const videosToUpdate: Video[] = [];

            const processEntry = async (handle: FileSystemDirectoryHandle | FileSystemFileHandle, path: string[]) => {
                const currentPath = [...path, handle.name];
                const pathStr = currentPath.join('/');

                if (handle.kind === 'file' && handle.name.match(/\.(mp4|webm|mov|mkv|avi)$/i)) {
                    foundPaths.add(pathStr);
                    const existingVideo = existingVideoPaths.get(pathStr);
                    if (!existingVideo) {
                        try {
                            const videoData = await processVideoHandle(handle, currentPath);
                            videosToAdd.push(videoData);
                        } catch (error) {
                            console.error(`Failed to process new file ${pathStr}:`, error);
                        }
                    } else if (!existingVideo.handle) { // It's a placeholder from import
                        videosToUpdate.push({ ...existingVideo, handle });
                    }
                } else if (handle.kind === 'directory') {
                    for await (const entry of handle.values()) {
                        await processEntry(entry, currentPath);
                    }
                }
            };
            
            for (const folder of libraryFolders) {
                for await (const entry of folder.handle.values()) {
                    await processEntry(entry, [folder.name]);
                }
            }

            const deletedVideoIds = allDbVideos
                .filter(v => v.filePath.length > 1 && !foundPaths.has(v.filePath.join('/')))
                .map(v => v.id);

            if (videosToAdd.length > 0) await db.addVideos(videosToAdd);
            if (videosToUpdate.length > 0) {
                 for(const video of videosToUpdate) await db.updateVideo(video);
            }
            if (deletedVideoIds.length > 0) await db.deleteVideos(deletedVideoIds);
            
            // Update state
            if (videosToAdd.length > 0 || videosToUpdate.length > 0 || deletedVideoIds.length > 0) {
                 const updatedVideos = await db.getAllVideos();
                 setVideos(updatedVideos);
            }

            alert(`Rescan complete. Found ${videosToAdd.length} new video(s), removed ${deletedVideoIds.length} missing video(s), and linked ${videosToUpdate.length} imported video(s).`);
        } catch (error) {
            console.error("Error during library rescan:", error);
            alert("An error occurred during the rescan. See console for details.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportLibrary = async () => {
        try {
            const [exportVideos, exportPlaylists] = await Promise.all([db.getAllVideos(), db.getAllPlaylists()]);
            
            const serializableVideos = exportVideos.map(({ handle, ...rest }) => rest);

            const exportData = {
                version: 1,
                exportDate: new Date().toISOString(),
                videos: serializableVideos,
                playlists: exportPlaylists,
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `localtube_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error exporting library:", error);
            alert("Could not export library. See console for details.");
        }
    };
    
    const handleImportLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("This will merge the backup with your current library. Existing items will be skipped. Continue?")) return;

        try {
            const text = await file.text();
            // FIX: Add a type for the parsed data to prevent 'unknown'/'any' related errors.
            type ImportedVideo = Omit<Video, 'handle'>;
            const data: { videos: ImportedVideo[], playlists: Playlist[] } = JSON.parse(text);

            if (!data.videos || !data.playlists) throw new Error("Invalid backup file format.");
            
            setLoadingMessage("Importing library...");
            setIsLoading(true);

            const allDbVideos = await db.getAllVideos();
            const existingVideoPaths = new Set(allDbVideos.map(v => v.filePath.join('/')));
            const videosToImport = data.videos.filter((v) => !existingVideoPaths.has(v.filePath.join('/')));
            
            // FIX: The imported videos don't have a 'handle', but the DB expects it.
            // Casting is safe here because the 'handle' property is now optional on the Video type.
            await db.addVideos(videosToImport as Video[]);

            const allDbPlaylists = await db.getAllPlaylists();
            const existingPlaylistIds = new Set(allDbPlaylists.map(p => p.id));
            for (const playlist of data.playlists as Playlist[]) {
                if (!existingPlaylistIds.has(playlist.id)) {
                    await db.savePlaylist(playlist);
                }
            }
            
            const [finalVideos, finalPlaylists] = await Promise.all([db.getAllVideos(), db.getAllPlaylists()]);
            setVideos(finalVideos);
            setPlaylists(finalPlaylists);

            alert(`Import complete. Imported ${videosToImport.length} new videos and some playlists. Please run a 'Rescan Library' to make the new videos playable.`);

        } catch (error) {
             console.error("Error importing library:", error);
             alert("Could not import library. File may be corrupt or in the wrong format.");
        } finally {
            setIsLoading(false);
            // Reset file input
            if (importInputRef.current) importInputRef.current.value = "";
        }
    };

    const filteredVideos = useMemo(() => {
        let tempVideos = [...videos];
        
        if (filter.type === 'favorites') {
            tempVideos = tempVideos.filter(v => v.isFavorite);
        } else if (filter.type === 'playlist' && filter.id) {
            const playlist = playlists.find(p => p.id === filter.id);
            if (playlist) {
                const videoIds = new Set(playlist.videoIds);
                tempVideos = tempVideos.filter(v => videoIds.has(v.id));
            }
        } else if (filter.type === 'tag' && filter.tag) {
            tempVideos = tempVideos.filter(v => v.tags.includes(filter.tag!));
        } else if (filter.type === 'smart') {
            tempVideos = tempVideos.filter(SMART_PLAYLISTS[filter.id].rule);
        }

        if (searchTerm) {
            tempVideos = tempVideos.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        tempVideos.sort((a, b) => {
            switch (sortOrder) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'date-asc':
                    return a.dateAdded - b.dateAdded;
                case 'date-desc':
                    return b.dateAdded - a.dateAdded;
                case 'duration-asc':
                    return a.duration - b.duration;
                case 'duration-desc':
                    return b.duration - a.duration;
                case 'rating-asc':
                    return a.rating - b.rating;
                case 'rating-desc':
                    return b.rating - a.rating;
                default:
                    return 0;
            }
        });
        
        return tempVideos;
    }, [videos, playlists, filter, searchTerm, sortOrder]);

    const allTags = useMemo(() => {
        const tagsSet = new Set<string>();
        videos.forEach(v => v.tags.forEach(t => tagsSet.add(t)));
        return Array.from(tagsSet).sort();
    }, [videos]);


    const deleteVideo = useCallback(async (videoId: string) => {
        if (window.confirm('Are you sure you want to remove this video from your library? This action cannot be undone.')) {
            setVideos(prev => prev.filter(v => v.id !== videoId));
            if (selectedVideoId === videoId) {
                setSelectedVideoId(null);
            }
            await db.deleteVideo(videoId);
        }
    }, [selectedVideoId]);

    const deleteVideos = useCallback(async (videoIds: string[]) => {
        setVideos(prev => prev.filter(v => !videoIds.includes(v.id)));
        if (selectedVideoId && videoIds.includes(selectedVideoId)) {
            setSelectedVideoId(null);
        }
        await db.deleteVideos(videoIds);
    }, [selectedVideoId]);

    const createPlaylist = useCallback(async (name: string) => {
        if (name && !playlists.some(p => p.name === name)) {
            const newPlaylist: Playlist = {
                id: crypto.randomUUID(),
                name,
                videoIds: [],
            };
            setPlaylists(prev => [...prev, newPlaylist].sort((a,b) => a.name.localeCompare(b.name)));
            await db.savePlaylist(newPlaylist);
        }
    }, [playlists]);

    const addVideoToPlaylist = useCallback(async (videoId: string, playlistId: string) => {
        let updatedPlaylist: Playlist | undefined;
        setPlaylists(prev => prev.map(p => {
            if (p.id === playlistId && !p.videoIds.includes(videoId)) {
                updatedPlaylist = { ...p, videoIds: [...p.videoIds, videoId] };
                return updatedPlaylist;
            }
            return p;
        }));
        if (updatedPlaylist) await db.savePlaylist(updatedPlaylist);
    }, []);
    
    const removeVideoFromPlaylist = useCallback(async (videoId: string, playlistId: string) => {
        let updatedPlaylist: Playlist | undefined;
        setPlaylists(prev => prev.map(p => {
            if (p.id === playlistId) {
                updatedPlaylist = { ...p, videoIds: p.videoIds.filter(id => id !== videoId) };
                return updatedPlaylist;
            }
            return p;
        }));
         if (updatedPlaylist) await db.savePlaylist(updatedPlaylist);
    }, []);

    const deletePlaylist = useCallback(async (playlistId: string) => {
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        if (filter.type === 'playlist' && filter.id === playlistId) {
            setFilter({ type: 'all' });
        }
        await db.deletePlaylist(playlistId);
    }, [filter]);

    const handleSeekTo = useCallback((timeInSeconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timeInSeconds;
            if (videoRef.current.paused) {
                videoRef.current.play();
            }
        }
    }, []);
    
    const handleCaptureThumbnailFromCurrentFrame = useCallback(async (videoId: string) => {
        if (!videoRef.current) return;

        try {
            const videoElement = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context.");
            
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const newThumbnail = canvas.toDataURL('image/jpeg', 0.8);

            const videoToUpdate = videos.find(v => v.id === videoId);
            if (videoToUpdate) {
                await updateVideo({ ...videoToUpdate, thumbnail: newThumbnail });
            }
        } catch (error) {
            console.error("Failed to capture thumbnail:", error);
            alert("Could not capture thumbnail from video frame.");
        }

    }, [videos, updateVideo]);


    return (
        <div className="flex h-screen bg-gray-900 text-gray-200 font-sans overflow-x-hidden">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" multiple className="hidden" />
            <input type="file" ref={importInputRef} onChange={handleImportLibrary} accept=".json" className="hidden" />
             {isDuplicateFinderOpen && (
                <DuplicateFinderModal 
                    videos={videos}
                    onClose={() => setIsDuplicateFinderOpen(false)}
                    onDeleteVideos={deleteVideos}
                />
            )}

            {/* Left Sidebar */}
            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isLeftSidebarCollapsed ? 'w-0' : 'w-64'}`}>
                <Sidebar 
                    isCollapsed={isLeftSidebarCollapsed}
                    playlists={playlists} 
                    tags={allTags}
                    filter={filter}
                    onFilterChange={(newFilter) => {
                        setFilter(newFilter);
                        setSelectedVideoId(null);
                    }}
                    onCreatePlaylist={createPlaylist}
                    onDeletePlaylist={deletePlaylist}
                    smartPlaylists={SMART_PLAYLISTS}
                />
            </div>

            {/* Left Sidebar Toggle */}
            <div className="flex items-center z-10">
                <button
                    onClick={() => setIsLeftSidebarCollapsed(p => !p)}
                    title={isLeftSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
                    className={`w-4 h-12 bg-gray-700 hover:bg-gray-600 rounded-r-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-500 transition-transform duration-300 ${isLeftSidebarCollapsed ? '-translate-x-1/2' : ''}`}
                >
                    <DoubleArrowLeftIcon className={`w-4 h-4 transition-transform duration-300 ${isLeftSidebarCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <div className="relative bg-gray-800 border-b border-gray-700 shadow-md flex-shrink-0">
                    <header className={`overflow-hidden transition-all duration-300 ease-in-out ${isHeaderCollapsed ? 'max-h-0' : 'max-h-40'}`}>
                        <div className="p-4 flex items-center justify-between" id="main-header-content">
                             <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1 max-w-lg">
                                    <input
                                        type="text"
                                        placeholder="Search videos..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                     {viewMode === 'grid' && (
                                        <div>
                                            <label htmlFor="sort-order" className="sr-only">Sort by</label>
                                            <select
                                                id="sort-order"
                                                value={sortOrder}
                                                onChange={e => setSortOrder(e.target.value as SortOrder)}
                                                className={inputClasses}
                                            >
                                                <option value="date-desc">Date Added (Newest)</option>
                                                <option value="date-asc">Date Added (Oldest)</option>
                                                <option value="name-asc">Name (A-Z)</option>
                                                <option value="name-desc">Name (Z-A)</option>
                                                <option value="duration-desc">Duration (Longest)</option>
                                                <option value="duration-asc">Duration (Shortest)</option>
                                                <option value="rating-desc">Rating (Highest)</option>
                                                <option value="rating-asc">Rating (Lowest)</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex items-center bg-gray-700 rounded-lg p-1 border border-gray-600">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                            title="Grid View"
                                        >
                                            <GridIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                            title="List View"
                                        >
                                            <ListIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="relative" ref={toolsMenuRef}>
                                    <button 
                                        onClick={() => setIsToolsMenuOpen(p => !p)}
                                        className={`${buttonClasses.base} ${buttonClasses.secondary}`}
                                    >
                                        <CogIcon className="w-5 h-5 -ml-1" />
                                        Tools
                                        <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform duration-200 ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isToolsMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-20 animate-fade-in-fast">
                                            <div className="py-1 text-white text-sm" role="menu" aria-orientation="vertical">
                                                <button onClick={() => { handleRescanLibrary(); setIsToolsMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-600 rounded-t-md" role="menuitem">
                                                    <SyncIcon className="w-5 h-5 mr-3" /> Rescan Library
                                                </button>
                                                <button onClick={() => { setIsDuplicateFinderOpen(true); setIsToolsMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-600" role="menuitem">
                                                    <DuplicateIcon className="w-5 h-5 mr-3" /> Find Duplicates
                                                </button>
                                                <div className="border-t border-gray-600 my-1"></div>
                                                <button onClick={() => { importInputRef.current?.click(); setIsToolsMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-600" role="menuitem">
                                                    <UploadIcon className="w-5 h-5 mr-3" /> Import Library Backup...
                                                </button>
                                                <button onClick={() => { handleExportLibrary(); setIsToolsMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-600 rounded-b-md" role="menuitem">
                                                    <DownloadIcon className="w-5 h-5 mr-3" /> Export Library Backup...
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleAddLibraryFolder}
                                    className={`${buttonClasses.base} ${buttonClasses.success}`}
                                >
                                <FolderIcon className="w-5 h-5 -ml-1" />
                                    Add Library
                                </button>
                                <button 
                                    onClick={handleAddFilesClick}
                                    className={`${buttonClasses.base} ${buttonClasses.primary}`}
                                >
                                <PlusIcon className="w-5 h-5 -ml-1" />
                                    Add Videos
                                </button>
                            </div>
                        </div>
                    </header>
                    <button
                        onClick={() => setIsHeaderCollapsed(p => !p)}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-4 bg-gray-700 hover:bg-gray-600 rounded-b-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-500 z-10"
                        title={isHeaderCollapsed ? 'Show Header' : 'Hide Header'}
                        aria-expanded={!isHeaderCollapsed}
                        aria-controls="main-header-content"
                    >
                        {isHeaderCollapsed ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {selectedVideo ? (
                        // VIDEO PLAYER VIEW
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <button
                                    onClick={() => setSelectedVideoId(null)}
                                    className={`${buttonClasses.base} ${buttonClasses.secondary} !py-1 !px-3 text-sm`}
                                >
                                    <ArrowLeftIcon className="w-5 h-5" />
                                    Back to Library
                                </button>
                                {transcriptUrl && (
                                    <button
                                        onClick={() => setAreSubtitlesVisible(p => !p)}
                                        className={`${buttonClasses.base} ${areSubtitlesVisible ? buttonClasses.primary : buttonClasses.secondary} !py-1 !px-3 text-sm`}
                                        title={areSubtitlesVisible ? 'Hide Subtitles' : 'Show Subtitles'}
                                    >
                                        <ClosedCaptionIcon className="w-5 h-5 -ml-1 mr-2" />
                                        <span>{areSubtitlesVisible ? 'Subtitles On' : 'Subtitles Off'}</span>
                                    </button>
                                )}
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-4">
                                <video
                                    ref={videoRef}
                                    key={selectedVideo.id}
                                    src={currentVideoUrl || ''}
                                    controls
                                    autoPlay
                                    onLoadedMetadata={() => {
                                        if (videoRef.current && selectedVideo.lastPlayedPosition) {
                                            videoRef.current.currentTime = selectedVideo.lastPlayedPosition;
                                        }
                                    }}
                                    onTimeUpdate={() => {
                                        if (videoRef.current) {
                                            lastPlayedPositionRef.current = videoRef.current.currentTime;
                                        }
                                    }}
                                    className="w-full h-full"
                                    crossOrigin="anonymous"
                                >
                                    {transcriptUrl && (
                                        <track
                                            key={transcriptUrl}
                                            kind="subtitles"
                                            src={transcriptUrl}
                                            srcLang="en"
                                            label="Transcript"
                                            default
                                        />
                                    )}
                                </video>
                            </div>
                            <VideoInfoPanel
                                video={selectedVideo}
                                onUpdateVideo={updateVideo}
                                onDeleteVideo={deleteVideo}
                                playlists={playlists}
                                onAddVideoToPlaylist={addVideoToPlaylist}
                                onRemoveVideoFromPlaylist={removeVideoFromPlaylist}
                                onSeekTo={handleSeekTo}
                                onCaptureThumbnail={handleCaptureThumbnailFromCurrentFrame}
                            />
                        </div>
                    ) : (
                        // LIBRARY VIEW
                        <>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="text-xl">{loadingMessage}</div>
                                </div>
                            ) : videos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                                    <h2 className="text-2xl font-semibold mb-2">Your Video Library is Empty</h2>
                                    <p className="mb-4">Click "Add Library" or "Add Videos" to get started.</p>
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={handleAddLibraryFolder}
                                            className={`${buttonClasses.base} ${buttonClasses.success} !px-6 !py-3 !text-lg`}
                                        >
                                            <FolderIcon className="w-6 h-6 mr-2" />
                                            Add Library
                                        </button>
                                        <button 
                                            onClick={handleAddFilesClick}
                                            className={`${buttonClasses.base} ${buttonClasses.primary} !px-6 !py-3 !text-lg`}
                                        >
                                            <PlusIcon className="w-6 h-6 mr-2" />
                                            Add Videos
                                        </button>
                                    </div>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <VideoGrid 
                                    videos={filteredVideos}
                                    onVideoSelect={setSelectedVideoId}
                                    selectedVideoId={selectedVideoId}
                                    addVideoToPlaylist={addVideoToPlaylist}
                                    playlists={playlists}
                                />
                            ) : (
                                <VideoList
                                    videos={filteredVideos}
                                    onVideoSelect={setSelectedVideoId}
                                    sortOrder={sortOrder}
                                    onSortOrderChange={setSortOrder}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Right Sidebar Toggle */}
            {selectedVideo && (
                 <div className="flex items-center z-10">
                    <button
                        onClick={() => setIsRightSidebarCollapsed(p => !p)}
                        title={isRightSidebarCollapsed ? 'Show "Up Next"' : 'Hide "Up Next"'}
                        className={`w-4 h-12 bg-gray-700 hover:bg-gray-600 rounded-l-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-500 transition-transform duration-300 ${isRightSidebarCollapsed ? 'translate-x-1/2' : ''}`}
                    >
                        <DoubleArrowLeftIcon className={`w-4 h-4 transition-transform duration-300 ${!isRightSidebarCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            )}
           
            {/* Right "Up Next" Sidebar */}
            {selectedVideo && (
                 <aside className={`flex-shrink-0 bg-gray-800 border-gray-700 shadow-lg transition-all duration-300 ease-in-out ${isRightSidebarCollapsed ? 'w-0' : 'w-64 border-l'}`}>
                     <div className={`h-full flex flex-col overflow-hidden transition-opacity duration-200 p-4 ${isRightSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                        <h3 className="text-xl font-semibold mb-4 flex-shrink-0">Up Next</h3>
                        <div className="overflow-y-auto space-y-4 scrollbar-hide">
                            {filteredVideos
                                .filter(v => v.id !== selectedVideo.id)
                                .map(video => (
                                    <VideoCard
                                        key={video.id}
                                        video={video}
                                        isSelected={false}
                                        onSelect={setSelectedVideoId}
                                        playlists={playlists}
                                        onAddToPlaylist={addVideoToPlaylist}
                                    />
                                ))
                            }
                        </div>
                    </div>
                </aside>
            )}

        </div>
    );
};

export default App;
