


import React, { useState } from 'react';
import { Playlist, Filter, Video, SmartPlaylistId } from '../types';
import { VideoLibraryIcon, HeartIcon, TagIcon, PlaylistIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon, DoubleArrowLeftIcon, ClockIcon, SparklesIcon, StarIcon } from './Icons';

interface SidebarProps {
    playlists: Playlist[];
    tags: string[];
    filter: Filter;
    onFilterChange: (filter: Filter) => void;
    onCreatePlaylist: (name: string) => void;
    onDeletePlaylist: (id: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    smartPlaylists: Record<SmartPlaylistId, { name: string, rule: (video: Video) => boolean }>;
}

const SMART_PLAYLIST_ICONS: Record<SmartPlaylistId, React.ReactNode> = {
    'recently-added': <ClockIcon className="w-5 h-5" />,
    'top-rated': <StarIcon className="w-5 h-5" />,
    'short-clips': <SparklesIcon className="w-5 h-5" />,
};

const Sidebar: React.FC<SidebarProps> = ({ playlists, tags, filter, onFilterChange, onCreatePlaylist, onDeletePlaylist, isCollapsed, onToggleCollapse, smartPlaylists }) => {
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(true);
    const [isTagsExpanded, setIsTagsExpanded] = useState(true);

    const handleCreatePlaylist = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim()) {
            onCreatePlaylist(newPlaylistName.trim());
            setNewPlaylistName('');
        }
    };
    
    const navItemClasses = "flex items-center w-full px-4 py-2 rounded-md cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500";
    const activeNavItemClasses = "bg-gray-700 text-white";
    const inactiveNavItemClasses = "text-gray-400 hover:bg-gray-700 hover:text-white";

    const getNavItemClass = (isActive: boolean) => `${navItemClasses} ${isActive ? activeNavItemClasses : inactiveNavItemClasses} ${isCollapsed ? 'justify-center' : ''}`;

    return (
        <aside className={`bg-gray-800 p-4 flex flex-col h-full border-r border-gray-700 shadow-lg transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`text-2xl font-bold mb-6 text-white tracking-wider ${isCollapsed ? 'hidden' : 'block'}`}>LocalTube</div>
            
            <nav className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
                <button 
                    className={getNavItemClass(filter.type === 'all')}
                    onClick={() => onFilterChange({ type: 'all' })}
                    title="All Videos"
                >
                    <VideoLibraryIcon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`}/>
                    {!isCollapsed && 'All Videos'}
                </button>
                <button
                    className={getNavItemClass(filter.type === 'favorites')}
                    onClick={() => onFilterChange({ type: 'favorites' })}
                    title="Favorites"
                >
                    <HeartIcon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`}/>
                    {!isCollapsed && 'Favorites'}
                </button>
                
                <div className="border-t border-gray-700 my-4"></div>

                {/* Smart Playlists */}
                 {!isCollapsed && <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Smart Views</h3>}
                 <div className="space-y-2">
                    {/* FIX: Use `Object.keys` for more robust type inference than `Object.entries`, which was causing an error. */}
                    {(Object.keys(smartPlaylists) as SmartPlaylistId[]).map((id) => {
                        const { name } = smartPlaylists[id];
                        return (
                             <button
                                key={id}
                                className={getNavItemClass(filter.type === 'smart' && filter.id === id)}
                                onClick={() => onFilterChange({ type: 'smart', id: id })}
                                title={name}
                            >
                                <span className={isCollapsed ? '' : 'mr-3'}>{SMART_PLAYLIST_ICONS[id]}</span>
                                {!isCollapsed && name}
                            </button>
                        );
                    })}
                </div>


                {!isCollapsed && (
                    <>
                        <div className="border-t border-gray-700 my-4"></div>
                        {/* Playlists Section */}
                        <div>
                            <button 
                                className="flex items-center justify-between w-full px-4 py-2 rounded-md cursor-pointer text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                onClick={() => setIsPlaylistsExpanded(!isPlaylistsExpanded)}
                            >
                                <div className="flex items-center">
                                    <PlaylistIcon className="w-5 h-5 mr-3" />
                                    <span className="font-semibold">Playlists</span>
                                </div>
                                {isPlaylistsExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                            </button>
                            {isPlaylistsExpanded && (
                                <div className="pl-6 mt-1 space-y-1">
                                    {playlists.map(p => (
                                        <div key={p.id} className="group flex items-center justify-between">
                                            <button
                                                className={getNavItemClass(filter.type === 'playlist' && filter.id === p.id) + ' flex-1 justify-start'}
                                                onClick={() => onFilterChange({ type: 'playlist', id: p.id })}
                                            >
                                                {p.name}
                                            </button>
                                            <button 
                                                onClick={() => onDeletePlaylist(p.id)}
                                                className="p-1 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:opacity-100"
                                                title={`Delete playlist "${p.name}"`}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <form onSubmit={handleCreatePlaylist} className="flex items-center gap-2 mt-2 p-1">
                                        <input 
                                            type="text"
                                            value={newPlaylistName}
                                            onChange={(e) => setNewPlaylistName(e.target.value)}
                                            placeholder="New playlist..."
                                            className="w-full bg-gray-700 text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button type="submit" className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <PlusIcon className="w-4 h-4"/>
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Tags Section */}
                        <div>
                            <button 
                                className="flex items-center justify-between w-full px-4 py-2 rounded-md cursor-pointer text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                            >
                                <div className="flex items-center">
                                    <TagIcon className="w-5 h-5 mr-3" />
                                    <span className="font-semibold">Tags</span>
                                </div>
                                {isTagsExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                            </button>
                            {isTagsExpanded && tags.length > 0 && (
                                <div className="pl-6 mt-1 space-y-1">
                                    {tags.map(tag => (
                                        <button
                                            key={tag}
                                            className={getNavItemClass(filter.type === 'tag' && filter.tag === tag) + ' justify-start'}
                                            onClick={() => onFilterChange({ type: 'tag', tag: tag })}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </nav>

            <div className="mt-auto border-t border-gray-700 pt-4">
                 <button 
                    onClick={onToggleCollapse} 
                    className={`w-full flex items-center p-2 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    <DoubleArrowLeftIcon className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                    {!isCollapsed && <span className="ml-3 font-semibold">Collapse</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;