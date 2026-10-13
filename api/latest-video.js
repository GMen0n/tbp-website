// Vercel Serverless Function to fetch and parse YouTube RSS feed
// Returns the latest non-shorts video including its title, video ID, and first paragraph of description.

module.exports = async function handler(req, res) {
    // Set CORS and Edge caching headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');

    try {
        const CHANNEL_ID = 'UCOEVBFZ15jo2HAWnfej9eDw';
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
        const response = await fetch(feedUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch YouTube RSS feed' });
        }
        const xml = await response.text();

        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        const videos = [];

        while ((match = entryRegex.exec(xml)) !== null) {
            const entryStr = match[1];
            const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(entryStr);
            const idMatch = /<yt:videoId>([\s\S]*?)<\/yt:videoId>/.exec(entryStr);
            const descMatch = /<media:description>([\s\S]*?)<\/media:description>/.exec(entryStr);
            const pubMatch = /<published>([\s\S]*?)<\/published>/.exec(entryStr);

            const title = titleMatch ? titleMatch[1].trim() : '';
            const videoId = idMatch ? idMatch[1].trim() : '';
            const rawDesc = descMatch ? descMatch[1] : '';
            const published = pubMatch ? pubMatch[1].trim() : '';

            // Filter out Shorts
            if (title.toLowerCase().includes('#shorts')) {
                continue;
            }

            // Extract the first non-empty paragraph from description
            const paragraphs = rawDesc.trim().split(/\r?\n\s*\r?\n/);
            let firstParagraph = '';
            for (const p of paragraphs) {
                const clean = p.trim().replace(/\s+/g, ' ');
                if (clean.length > 0) {
                    firstParagraph = clean;
                    break;
                }
            }

            videos.push({
                title,
                videoId,
                description: firstParagraph,
                published
            });
        }

        if (videos.length === 0) {
            return res.status(404).json({ error: 'No videos found' });
        }

        return res.status(200).json(videos[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
