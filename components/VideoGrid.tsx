
import React from 'react';
import { Video, Playlist } from '../types';
import VideoCard from './VideoCard';

interface VideoGridProps {
    videos: Video[];
    playlists: Playlist[];
    onVideoSelect: (id: string) => void;
    selectedVideoId: string | null;
    addVideoToPlaylist: (videoId: string, playlistId: string) => void;
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos, playlists, onVideoSelect, selectedVideoId, addVideoToPlaylist }) => {
    if (videos.length === 0) {
        return <div className="text-center text-gray-400 mt-10">No videos found matching your criteria.</div>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {videos.map(video => (
                <VideoCard 
                    key={video.id}
                    video={video}
                    isSelected={video.id === selectedVideoId}
                    onSelect={onVideoSelect}
                    playlists={playlists}
                    onAddToPlaylist={addVideoToPlaylist}
                />
            ))}
        </div>
    );
};

export default VideoGrid;