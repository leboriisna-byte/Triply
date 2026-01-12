// TikTok data extraction service using TikWM API
// TikWM is free (5000 requests/day) and requires no API key

export interface TikTokData {
    id: string;
    title: string;           // Caption text
    cover: string;           // Thumbnail URL
    playUrl: string;         // Video URL (no watermark)
    hdPlayUrl: string;       // HD video URL
    duration: number;        // Video duration in seconds
    images?: string[];       // Images for slideshows
    author: {
        uniqueId: string;
        nickname: string;
        avatarUrl: string;
    };
}

export interface TikTokApiResponse {
    code: number;
    msg: string;
    data: {
        id: string;
        title: string;
        cover: string;
        play: string;
        hdplay: string;
        duration: number;
        images?: string[];
        author: {
            unique_id: string;
            nickname: string;
            avatar: string;
        };
    };
}

/**
 * Validates if a URL is a TikTok link
 */
export function isTikTokUrl(url: string): boolean {
    const tiktokPatterns = [
        /^https?:\/\/(www\.)?tiktok\.com\/@[\w.]+\/video\/\d+/i,
        /^https?:\/\/vm\.tiktok\.com\/[\w]+/i,
        /^https?:\/\/(www\.)?tiktok\.com\/t\/[\w]+/i,
    ];
    return tiktokPatterns.some(pattern => pattern.test(url.trim()));
}

/**
 * Fetch TikTok video data using TikWM API
 */
export async function fetchTikTokData(url: string): Promise<TikTokData> {
    if (!isTikTokUrl(url)) {
        throw new Error('Invalid TikTok URL. Please paste a valid TikTok video link.');
    }

    const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url.trim())}`;

    console.log('Fetching TikTok data from TikWM...');

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`TikWM API error: ${response.status}`);
    }

    const json: TikTokApiResponse = await response.json();

    if (json.code !== 0 || !json.data) {
        throw new Error(json.msg || 'Failed to fetch TikTok data. The video may be private or deleted.');
    }

    const { data } = json;

    console.log('TikTok data fetched successfully:', data.title?.substring(0, 50));

    return {
        id: data.id,
        title: data.title || '',
        cover: data.cover || '',
        playUrl: data.play || '',
        hdPlayUrl: data.hdplay || data.play || '',
        duration: data.duration || 0,
        images: data.images || [],
        author: {
            uniqueId: data.author?.unique_id || '',
            nickname: data.author?.nickname || '',
            avatarUrl: data.author?.avatar || '',
        },
    };
}

/**
 * Download video and convert to base64 for Gemini API
 * TikTok videos are typically small (5-15MB), fitting within inline limits
 */
export async function downloadVideoAsBase64(videoUrl: string): Promise<string> {
    console.log('Downloading video for analysis...');

    const response = await fetch(videoUrl);

    if (!response.ok) {
        throw new Error('Failed to download video');
    }

    const blob = await response.blob();

    // Convert blob to base64
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix (e.g., "data:video/mp4;base64,")
            const base64Data = base64.split(',')[1];
            console.log('Video downloaded and encoded, size:', Math.round(base64Data.length / 1024), 'KB');
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Download multiple images and convert to base64 array
 */
export async function downloadImagesAsBase64(imageUrls: string[]): Promise<string[]> {
    console.log(`Downloading ${imageUrls.length} images for analysis...`);

    // Limit to first 12 images to avoid token limits/overwhelming AI
    const limitedUrls = imageUrls.slice(0, 12);

    const base64Promises = limitedUrls.map(async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();

            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    resolve(base64.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error('Failed to download image:', url, e);
            return null;
        }
    });

    const results = await Promise.all(base64Promises);
    return results.filter((b): b is string => b !== null);
}
