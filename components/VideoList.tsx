import React from 'react';
import { Video } from '../types';
import { StarIcon, ArrowUpIcon, ArrowDownIcon } from './Icons';

type SortOrder = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'duration-asc' | 'duration-desc' | 'rating-desc' | 'rating-asc';

interface VideoListProps {
    videos: Video[];
    onVideoSelect: (id: string) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (newOrder: SortOrder) => void;
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        return '0:00';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

type SortKey = 'name' | 'duration' | 'rating' | 'date';

const SortableHeader: React.FC<{
    title: string;
    sortKey: SortKey;
    currentSortOrder: SortOrder;
    onSort: (newOrder: SortOrder) => void;
    className?: string;
}> = ({ title, sortKey, currentSortOrder, onSort, className }) => {
    const [activeKey, direction] = currentSortOrder.split('-');
    const isActive = activeKey === sortKey;
    
    const handleClick = () => {
        if (isActive) {
            onSort(`${sortKey}-${direction === 'asc' ? 'desc' : 'asc'}` as SortOrder);
        } else {
            // Default to desc for new columns, except for name
            const defaultDirection = sortKey === 'name' ? 'asc' : 'desc';
            onSort(`${sortKey}-${defaultDirection}` as SortOrder);
        }
    };

    return (
        <th className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${className}`}>
            <button onClick={handleClick} className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                <span className="group-hover:text-white transition-colors">{title}</span>
                <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                    {isActive && direction === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                </span>
            </button>
        </th>
    );
};

const VideoList: React.FC<VideoListProps> = ({ videos, onVideoSelect, sortOrder, onSortOrderChange }) => {
    if (videos.length === 0) {
        return <div className="text-center text-gray-400 mt-10">No videos found matching your criteria.</div>;
    }

    return (
        <div className="overflow-x-auto animate-fade-in">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800/50">
                    <tr>
                        <th className="px-4 py-3 w-28"></th>
                        <SortableHeader title="Name" sortKey="name" currentSortOrder={sortOrder} onSort={onSortOrderChange} />
                        <SortableHeader title="Duration" sortKey="duration" currentSortOrder={sortOrder} onSort={onSortOrderChange} className="w-32" />
                        <SortableHeader title="Rating" sortKey="rating" currentSortOrder={sortOrder} onSort={onSortOrderChange} className="w-36" />
                        <SortableHeader title="Date Added" sortKey="date" currentSortOrder={sortOrder} onSort={onSortOrderChange} className="w-40" />
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {videos.map(video => (
                        <tr
                            key={video.id}
                            onClick={() => onVideoSelect(video.id)}
                            className="hover:bg-gray-700 cursor-pointer transition-colors focus-within:bg-gray-700"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onVideoSelect(video.id)}
                        >
                            <td className="px-4 py-2">
                                <img src={video.thumbnail} alt={video.name} className="w-24 h-14 object-cover rounded-md" />
                            </td>
                            <td className="px-4 py-2 font-medium text-white align-top">
                                <div className="truncate" title={video.name}>{video.name}</div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-300 align-top">{formatDuration(video.duration)}</td>
                            <td className="px-4 py-2 align-top">
                                {video.rating > 0 ? (
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <StarIcon key={i} className={`w-4 h-4 ${i < video.rating ? 'text-yellow-400' : 'text-gray-600'}`} />
                                        ))}
                                    </div>
                                ) : <span className="text-gray-500">-</span>}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-300 align-top">{formatDate(video.dateAdded)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default VideoList;
