


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Video, Playlist } from '../types';
import { HeartIcon, TagIcon, XIcon, PlusIcon, MinusIcon, TrashIcon, CommentIcon, TranscriptIcon, InfoIcon, ChevronDownIcon, ChevronRightIcon, DescriptionIcon, DocumentTextIcon, FolderIcon, StarIcon } from './Icons';

interface VideoInfoPanelProps {
    video: Video;
    onUpdateVideo: (video: Video) => void;
    onDeleteVideo: (videoId: string) => void;
    playlists: Playlist[];
    onAddVideoToPlaylist: (videoId: string, playlistId: string) => void;
    onRemoveVideoFromPlaylist: (videoId: string, playlistId: string) => void;
    onSeekTo: (timeInSeconds: number) => void;
    onCaptureThumbnail: (videoId: string) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatBitrate = (bits?: number) => {
    if (!bits || bits === 0) return 'N/A';
    const k = 1000;
    const sizes = ['bps', 'kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bits) / Math.log(k));
    return parseFloat((bits / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const inputBaseClasses = "w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, icon, isExpanded, onToggle, children }) => {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4">
            <button onClick={onToggle} className="w-full flex justify-between items-center text-left font-semibold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded p-1 -m-1">
                <div className="flex items-center">
                    {icon}
                    {title}
                </div>
                {isExpanded ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
            </button>
            {isExpanded && (
                <div className="pl-8 mt-3 animate-fade-in-fast">
                    {children}
                </div>
            )}
        </div>
    );
};

const StarRating: React.FC<{ rating: number; onRatingChange: (rating: number) => void; }> = ({ rating, onRatingChange }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
            {[...Array(5)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <button
                        key={starValue}
                        className="focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-sm"
                        onMouseEnter={() => setHoverRating(starValue)}
                        onClick={() => onRatingChange(starValue)}
                    >
                        <StarIcon
                            className={`w-6 h-6 cursor-pointer transition-colors ${
                                starValue <= (hoverRating || rating)
                                    ? 'text-yellow-400'
                                    : 'text-gray-600'
                            }`}
                        />
                    </button>
                );
            })}
        </div>
    );
};

const VideoInfoPanel: React.FC<VideoInfoPanelProps> = ({ video, onUpdateVideo, onDeleteVideo, playlists, onAddVideoToPlaylist, onRemoveVideoFromPlaylist, onSeekTo, onCaptureThumbnail }) => {
    const [newTag, setNewTag] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInputValue, setNameInputValue] = useState(video.name);
    const [commentText, setCommentText] = useState(video.comments);
    const [descriptionText, setDescriptionText] = useState(video.description);
    const [isTechDetailsExpanded, setIsTechDetailsExpanded] = useState(false);
    const [isContentExpanded, setIsContentExpanded] = useState(true);
    const [isOrganizationExpanded, setIsOrganizationExpanded] = useState(true);
    const [isThumbnailExpanded, setIsThumbnailExpanded] = useState(false);
    const [isEditingComments, setIsEditingComments] = useState(false);

    const transcriptInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        setIsEditingName(false);
        setNewTag('');
        setCommentText(video.comments);
        setDescriptionText(video.description);
        setIsEditingComments(false);
    }, [video.id, video.comments, video.description]);

    useEffect(() => {
        if (!isEditingName) {
            setNameInputValue(video.name);
        }
    }, [video.name, isEditingName]);

    const handleNameSave = () => {
        const trimmedName = nameInputValue.trim();
        if (trimmedName && trimmedName !== video.name) {
            onUpdateVideo({ ...video, name: trimmedName });
        }
        setIsEditingName(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNameSave();
        } else if (e.key === 'Escape') {
            setIsEditingName(false);
            setNameInputValue(video.name);
        }
    };

    const toggleFavorite = () => {
        onUpdateVideo({ ...video, isFavorite: !video.isFavorite });
    };

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTag = newTag.trim();
        if (trimmedTag && !video.tags.includes(trimmedTag)) {
            onUpdateVideo({ ...video, tags: [...video.tags, trimmedTag].sort() });
            setNewTag('');
        }
    };
    
    const removeTag = (tagToRemove: string) => {
        onUpdateVideo({ ...video, tags: video.tags.filter(tag => tag !== tagToRemove) });
    };

    const handleCommentBlur = () => {
        if (commentText !== video.comments) {
            onUpdateVideo({ ...video, comments: commentText });
        }
    };
    
    const handleDescriptionBlur = () => {
        if (descriptionText !== video.description) {
            onUpdateVideo({ ...video, description: descriptionText });
        }
    };

    const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            onUpdateVideo({ ...video, transcript: content });
        };
        reader.readAsText(file);
    };
    
    const removeTranscript = () => {
        onUpdateVideo({ ...video, transcript: undefined });
    };
    
    const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const newThumbnail = e.target?.result as string;
            onUpdateVideo({ ...video, thumbnail: newThumbnail });
        };
        reader.readAsDataURL(file);
    };

    const parsedComments = useMemo(() => {
        if (!video.comments) {
            return <span className="text-gray-400">Add personal notes... Timestamps like 01:23:45 are clickable.</span>;
        }

        const timestampRegex = /\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/g;
        const parts: (string | React.ReactElement)[] = [];
        let lastIndex = 0;
        let match;

        while ((match = timestampRegex.exec(video.comments)) !== null) {
            if (match.index > lastIndex) {
                parts.push(video.comments.substring(lastIndex, match.index));
            }

            const timestampStr = match[0];
            const hours = parseInt(match[1] || '0', 10);
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

            parts.push(
                <button
                    key={`${match.index}-${timestampStr}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (totalSeconds <= video.duration) {
                           onSeekTo(totalSeconds);
                        }
                    }}
                    className="text-blue-400 hover:underline focus:outline-none focus:text-blue-300 focus:underline"
                    title={`Seek to ${timestampStr}`}
                >
                    {timestampStr}
                </button>
            );
            lastIndex = match.index + timestampStr.length;
        }

        if (lastIndex < video.comments.length) {
            parts.push(video.comments.substring(lastIndex));
        }
        
        return parts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>);

    }, [video.comments, video.duration, onSeekTo]);

    const videoPlaylists = playlists.filter(p => p.videoIds.includes(video.id));
    const availablePlaylists = playlists.filter(p => !p.videoIds.includes(video.id));
    
    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl">
            <input type="file" accept=".vtt,.srt,.txt" ref={transcriptInputRef} onChange={handleTranscriptUpload} className="hidden" />
            <input type="file" accept="image/*" ref={thumbnailInputRef} onChange={handleThumbnailUpload} className="hidden" />
            
            {/* Name & Top-level Actions */}
            <div className="mb-4">
                {isEditingName ? (
                    <div className="mb-2">
                        <input
                            type="text"
                            value={nameInputValue}
                            onChange={(e) => setNameInputValue(e.target.value)}
                            onBlur={handleNameSave}
                            onKeyDown={handleNameKeyDown}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            className={`${inputBaseClasses} text-2xl font-bold !px-2 !py-1`}
                        />
                    </div>
                ) : (
                    <h3 
                        className="font-bold text-2xl break-words mb-2 p-1 -m-1 rounded cursor-pointer hover:bg-gray-700 focus:outline-none focus:bg-gray-700 focus:ring-2 focus:ring-blue-500" 
                        title="Click to edit name"
                        onClick={() => setIsEditingName(true)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(true)}
                    >
                        {video.name}
                    </h3>
                )}
                
                <div className="flex items-center gap-4">
                     <StarRating rating={video.rating} onRatingChange={(newRating) => onUpdateVideo({...video, rating: newRating})} />
                    <button onClick={toggleFavorite} className="flex items-center text-left p-2 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500">
                        <HeartIcon className={`w-6 h-6 mr-2 ${video.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                        Favorite
                    </button>
                    <button onClick={() => onDeleteVideo(video.id)} className="flex items-center text-left p-2 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500">
                        <TrashIcon className="w-6 h-6 mr-2" />
                        Delete
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Technical Details Section */}
                <CollapsibleSection title="Technical Details" icon={<InfoIcon className="w-5 h-5 mr-3"/>} isExpanded={isTechDetailsExpanded} onToggle={() => setIsTechDetailsExpanded(p => !p)}>
                    <div className="space-y-2 text-sm text-gray-300">
                        <div><strong>Resolution:</strong> {video.resolution.width}x{video.resolution.height}</div>
                        <div><strong>Frame Rate:</strong> {video.frameRate ? `${Math.round(video.frameRate)} fps` : 'N/A'}</div>
                        <div><strong>Size:</strong> {formatBytes(video.size)}</div>
                        <div><strong>Bitrate:</strong> {formatBitrate(video.bitrate)}</div>
                        <div><strong>Codec:</strong> {video.codec ? <span className="uppercase">{video.codec.split('.')[0]}</span> : 'N/A'}</div>
                    </div>
                </CollapsibleSection>
                
                 {/* Thumbnail Section */}
                <CollapsibleSection title="Thumbnail" icon={<FolderIcon className="w-5 h-5 mr-3"/>} isExpanded={isThumbnailExpanded} onToggle={() => setIsThumbnailExpanded(p => !p)}>
                    <div className="flex items-center gap-4">
                        <img src={video.thumbnail} alt="Current thumbnail" className="w-40 h-24 object-cover rounded-md border-2 border-gray-600" />
                        <div className="flex-1 space-y-2">
                             <button onClick={() => onCaptureThumbnail(video.id)} className="w-full text-sm font-semibold py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500">
                                Vom Player übernehmen
                            </button>
                             <button onClick={() => thumbnailInputRef.current?.click()} className="w-full text-sm font-semibold py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-gray-600 hover:bg-gray-700 text-gray-200 focus:ring-gray-500">
                                Bild hochladen...
                            </button>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Content & Notes Section */}
                <CollapsibleSection title="Content & Notes" icon={<DocumentTextIcon className="w-5 h-5 mr-3"/>} isExpanded={isContentExpanded} onToggle={() => setIsContentExpanded(p => !p)}>
                    <div className="space-y-4">
                        {/* Description */}
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center"><DescriptionIcon className="w-5 h-5 mr-2"/>Description</h4>
                            <textarea 
                                value={descriptionText}
                                onChange={(e) => setDescriptionText(e.target.value)}
                                onBlur={handleDescriptionBlur}
                                placeholder="Add a description..."
                                className={`${inputBaseClasses} h-28 !px-3 !py-2 text-sm resize-y`}
                            />
                        </div>
                        
                        {/* Comments */}
                        <div>
                           <h4 className="font-semibold mb-2 flex items-center"><CommentIcon className="w-5 h-5 mr-2"/>Comments</h4>
                            {isEditingComments ? (
                                <textarea 
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onBlur={() => {
                                        handleCommentBlur();
                                        setIsEditingComments(false);
                                    }}
                                    placeholder="Add personal notes... Timestamps like 01:23:45 are clickable."
                                    className={`${inputBaseClasses} h-24 !px-3 !py-2 text-sm resize-y`}
                                    autoFocus
                                />
                            ) : (
                                <div 
                                    onClick={() => setIsEditingComments(true)}
                                    className={`${inputBaseClasses} h-24 !px-3 !py-2 text-sm overflow-auto whitespace-pre-wrap break-words cursor-text scrollbar-hide`}
                                >
                                    {parsedComments}
                                </div>
                            )}
                        </div>

                        {/* Transcript Section */}
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center"><TranscriptIcon className="w-5 h-5 mr-2"/>Transcript</h4>
                            {video.transcript ? (
                                <div>
                                    <pre className="w-full h-20 bg-gray-900 rounded p-2 text-xs text-gray-300 overflow-auto font-mono whitespace-pre-wrap break-words border border-gray-700 scrollbar-hide">
                                        {video.transcript}
                                    </pre>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => transcriptInputRef.current?.click()} className="font-semibold py-1 px-3 w-full rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 text-sm">Replace</button>
                                        <button onClick={removeTranscript} className="font-semibold py-1 px-3 w-full rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 text-sm">Remove</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => transcriptInputRef.current?.click()} className="w-full text-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    Upload Transcript
                                </button>
                            )}
                        </div>
                    </div>
                </CollapsibleSection>

                 {/* Organization Section */}
                <CollapsibleSection title="Organization" icon={<FolderIcon className="w-5 h-5 mr-3"/>} isExpanded={isOrganizationExpanded} onToggle={() => setIsOrganizationExpanded(p => !p)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tags Section */}
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center"><TagIcon className="w-5 h-5 mr-2"/>Tags</h4>
                            <div className="flex flex-wrap gap-2 mb-2 min-h-[30px]">
                                {video.tags.map(tag => (
                                    <span key={tag} className="flex items-center bg-blue-600 text-white text-xs font-semibold pl-2.5 pr-1 py-1 rounded-full">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="ml-1.5 p-0.5 rounded-full hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-white">
                                            <XIcon className="w-3 h-3"/>
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <form onSubmit={handleAddTag} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Add a tag..."
                                    className={`${inputBaseClasses} !text-sm !px-2 !py-1`}
                                />
                                <button type="submit" className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <PlusIcon className="w-4 h-4"/>
                                </button>
                            </form>
                        </div>

                        {/* Playlists Section */}
                        <div>
                            <h4 className="font-semibold mb-2">Playlists</h4>
                            <div className="space-y-1 mb-2 max-h-24 overflow-y-auto scrollbar-hide">
                                {videoPlaylists.length > 0 ? videoPlaylists.map(p => (
                                    <div key={p.id} className="flex items-center justify-between text-sm bg-gray-900/50 px-2 py-1 rounded">
                                        <span>{p.name}</span>
                                        <button onClick={() => onRemoveVideoFromPlaylist(video.id, p.id)} title="Remove from playlist" className="p-1 rounded-full text-gray-400 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-500">
                                            <MinusIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )) : <p className="text-sm text-gray-400">Not in any playlist.</p>}
                            </div>
                            
                            <div className="space-y-1">
                                {availablePlaylists.length > 0 && (
                                    <div className="relative group">
                                        <button className="w-full text-left flex items-center text-sm bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500">
                                            <PlusIcon className="w-4 h-4 mr-2" /> Add to...
                                        </button>
                                        <div className="absolute bottom-full mb-2 w-full bg-gray-600 rounded shadow-lg hidden group-focus-within:block hover:block focus:block border border-gray-500">
                                            {availablePlaylists.map(p => (
                                                <button key={p.id} onClick={() => onAddVideoToPlaylist(video.id, p.id)} className="w-full text-left block px-3 py-2 hover:bg-gray-500 focus:bg-gray-500 focus:outline-none">
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
};

export default VideoInfoPanel;