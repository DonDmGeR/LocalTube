
import { Video } from '../types';

declare const MP4Box: any;

// A generic function to extract metadata from a File object
const extractMetadataFromFile = (file: File): Promise<Omit<Video, 'id' | 'handle' | 'filePath' | 'tags' | 'isFavorite' | 'dateAdded' | 'lastPlayedPosition' | 'comments' | 'transcript' | 'description' | 'rating'>> => {
    return new Promise((resolve, reject) => {
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        const url = URL.createObjectURL(file);
        videoElement.src = url;

        const cleanup = () => URL.revokeObjectURL(url);

        videoElement.onloadedmetadata = () => {
            videoElement.currentTime = 1; // Seek to get a thumbnail frame
        };

        videoElement.onseeked = async () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context.'));
                
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

                const advancedData = await getAdvancedMetadata(file);

                const videoData = {
                    thumbnail,
                    name: file.name,
                    duration: videoElement.duration,
                    size: file.size,
                    resolution: {
                        width: videoElement.videoWidth,
                        height: videoElement.videoHeight,
                    },
                    codec: advancedData.codec,
                    bitrate: advancedData.bitrate || (videoElement.duration > 0 ? (file.size * 8) / videoElement.duration : undefined),
                    frameRate: advancedData.frameRate,
                };
                cleanup();
                resolve(videoData);

            } catch (e) {
                cleanup();
                reject(e);
            }
        };

        videoElement.onerror = (error) => {
            cleanup();
            console.error('Error loading video metadata:', error);
            reject(new Error(`Could not process video file: ${file.name}`));
        };
    });
};


const getAdvancedMetadata = (file: File): Promise<{ codec?: string; bitrate?: number; frameRate?: number; }> => {
    return new Promise((resolve) => {
        if (!file.type.includes('mp4') || typeof MP4Box === 'undefined') {
            return resolve({});
        }

        const mp4boxfile = MP4Box.createFile();

        mp4boxfile.onReady = (info: any) => {
            const videoTrack = info.videoTracks[0];
            if (videoTrack) {
                const codec = videoTrack.codec;
                const bitrate = videoTrack.bitrate;
                const frameRate = videoTrack.nb_samples / (videoTrack.duration / videoTrack.timescale);
                resolve({ codec, bitrate, frameRate });
            } else {
                resolve({});
            }
        };

        mp4boxfile.onError = (error: any) => {
            console.warn('mp4box error:', error);
            resolve({});
        };

        const reader = new FileReader();
        reader.onload = (e: any) => {
            const arrayBuffer = e.target.result;
            arrayBuffer.fileStart = 0;
            mp4boxfile.appendBuffer(arrayBuffer);
            mp4boxfile.flush();
        };
        reader.onerror = (error) => {
             console.warn('FileReader error:', error);
             resolve({});
        };
        reader.readAsArrayBuffer(file);
    });
};

// Process a FileSystemFileHandle
export const processVideoHandle = async (handle: FileSystemFileHandle, path: string[]): Promise<Video> => {
    const file = await handle.getFile();
    const metadata = await extractMetadataFromFile(file);
    
    return {
        id: crypto.randomUUID(),
        handle: handle,
        filePath: path,
        ...metadata,
        tags: [],
        isFavorite: false,
        rating: 0,
        dateAdded: Date.now(),
        lastPlayedPosition: 0,
        comments: '',
        transcript: undefined,
        description: '',
    };
};

// Process a standard File (from <input type="file">)
export const processVideoFile = async (file: File): Promise<Video> => {
    // This flow is for single-file imports where a persistent FileSystemFileHandle is not available.
    const metadata = await extractMetadataFromFile(file);

    return {
        id: crypto.randomUUID(),
        // FIX: Removed the fake 'handle' object to align with the now-optional 'handle' property.
        // A real handle will be associated during a library rescan if the file is in a library folder.
        filePath: [file.name],
        ...metadata,
        tags: [],
        isFavorite: false,
        rating: 0,
        dateAdded: Date.now(),
        lastPlayedPosition: 0,
        comments: '',
        transcript: undefined,
        description: '',
    };
};