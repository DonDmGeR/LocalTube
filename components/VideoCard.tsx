


import React, { useState } from 'react';
import { Video, Playlist } from '../types';
import { PlayIcon, DotsVerticalIcon, PlusIcon, StarIcon } from './Icons';

interface VideoCardProps {
    video: Video;
    isSelected: boolean;
    onSelect: (id: string) => void;
    playlists: Playlist[];
    onAddToPlaylist: (videoId: string, playlistId: string) => void;
}

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(h > 0 ? 2 : 0, '0'));
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
};

const VideoCard: React.FC<VideoCardProps> = ({ video, isSelected, onSelect, playlists, onAddToPlaylist }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    const handleAddToPlaylist = (e: React.MouseEvent, playlistId: string) => {
        e.stopPropagation();
        onAddToPlaylist(video.id, playlistId);
        setIsMenuOpen(false);
    }
    
    const progress = video.duration > 0 && video.lastPlayedPosition ? (video.lastPlayedPosition / video.duration) * 100 : 0;

    return (
        <div 
            className={`relative group rounded-lg overflow-hidden bg-gray-800 shadow-xl border border-gray-700 cursor-pointer transition-all duration-300 focus:outline-none ${isSelected ? 'ring-4 ring-blue-500 scale-105' : 'hover:scale-105 hover:shadow-2xl focus-within:ring-4 focus-within:ring-blue-500 focus-within:scale-105'}`}
            onClick={() => onSelect(video.id)}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(video.id)}
        >
            <div className="relative">
                <img src={video.thumbnail} alt={video.name} className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                    <div
                        className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform group-hover:scale-110 transition-all duration-300"
                    >
                        <PlayIcon className="w-8 h-8"/>
                    </div>
                </div>
                <span className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                </span>
                {progress > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600 bg-opacity-75">
                        <div className="h-full bg-red-600" style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>
            <div className="p-3">
                <h3 className="text-sm font-semibold truncate text-white" title={video.name}>{video.name}</h3>
                
                <div className="mt-1 h-5 relative">
                    {/* Rating view (default) */}
                    <div className="absolute inset-0 flex items-center transition-opacity duration-200 group-hover:opacity-0">
                        {video.rating > 0 && (
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon key={i} className={`w-3.5 h-3.5 ${i < video.rating ? 'text-yellow-400' : 'text-gray-600'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Metadata view (on hover) */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center">
                        <div className="text-xs text-gray-400 flex items-center justify-between w-full">
                            <span>{video.resolution.width}x{video.resolution.height}</span>
                            <span>{formatBytes(video.size)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="absolute top-1 right-1">
                    <button 
                        onClick={handleMenuToggle}
                        className="p-1.5 rounded-full text-white bg-gray-800 bg-opacity-50 hover:bg-gray-700 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <DotsVerticalIcon className="w-5 h-5"/>
                    </button>
                    {isMenuOpen && (
                        <div 
                            className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 border border-gray-600"
                            onMouseLeave={() => setIsMenuOpen(false)}
                        >
                           <div className="py-1 text-white text-sm">
                                <div className="px-3 py-1 font-bold">Add to Playlist</div>
                                {playlists.map(p => (
                                    <button key={p.id} onClick={(e) => handleAddToPlaylist(e, p.id)} className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-600 focus:bg-gray-600 focus:outline-none">
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        {p.name}
                                    </button>
                                ))}
                                {playlists.length === 0 && <span className="block px-3 py-2 text-gray-400">No playlists</span>}
                           </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoCard;