


import React, { useState, useMemo, useCallback } from 'react';
import { Video } from '../types';
import { TrashIcon, XIcon } from './Icons';

interface DuplicateFinderModalProps {
    videos: Video[];
    onClose: () => void;
    onDeleteVideos: (videoIds: string[]) => void;
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
};

const buttonClasses = {
    base: 'font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed',
};

const iconButtonClasses = 'bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500';

const DuplicateFinderModal: React.FC<DuplicateFinderModalProps> = ({ videos, onClose, onDeleteVideos }) => {
    const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());

    const duplicateGroups = useMemo(() => {
        const groups = new Map<string, Video[]>();
        videos.forEach(video => {
            // Group by size and duration (rounded to nearest second)
            const key = `${video.size}-${Math.round(video.duration)}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(video);
        });
        
        return Array.from(groups.values()).filter(group => group.length > 1);
    }, [videos]);

    const toggleSelection = (videoId: string) => {
        setSelectedToDelete(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            return newSet;
        });
    };
    
    const handleDeleteSelected = () => {
        if (selectedToDelete.size === 0) return;
        if (window.confirm(`Are you sure you want to remove ${selectedToDelete.size} video(s) from your library? This cannot be undone.`)) {
            onDeleteVideos(Array.from(selectedToDelete));
            setSelectedToDelete(new Set());
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-fast"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Duplicate Video Finder</h2>
                    <button onClick={onClose} className={iconButtonClasses}>
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {duplicateGroups.length === 0 ? (
                        <p className="text-center text-gray-400">No duplicate videos found.</p>
                    ) : (
                        duplicateGroups.map((group, index) => (
                            <div key={index} className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="font-semibold mb-3 border-b border-gray-600 pb-2">
                                    Set {index + 1}: {group.length} videos ({formatBytes(group[0].size)}, {Math.round(group[0].duration)}s)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.map(video => (
                                        <div key={video.id} className="bg-gray-800 p-2 rounded-md flex items-start gap-3">
                                            <input 
                                                type="checkbox"
                                                checked={selectedToDelete.has(video.id)}
                                                onChange={() => toggleSelection(video.id)}
                                                className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                                            />
                                            <div className="flex-1 overflow-hidden">
                                                <img src={video.thumbnail} alt="" className="w-full h-20 object-cover rounded-md mb-2"/>
                                                <p className="text-sm font-medium truncate" title={video.name}>{video.name}</p>
                                                <p className="text-xs text-gray-400 truncate" title={video.filePath.join(' / ')}>{video.filePath.join(' / ')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <footer className="p-4 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className={`${buttonClasses.base} ${buttonClasses.secondary}`}>
                        Close
                    </button>
                    <button 
                        onClick={handleDeleteSelected}
                        disabled={selectedToDelete.size === 0}
                        className={`${buttonClasses.base} ${buttonClasses.danger}`}
                    >
                       <TrashIcon className="w-5 h-5 -ml-1" />
                        Delete ({selectedToDelete.size}) Selected
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default DuplicateFinderModal;