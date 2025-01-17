let videos = [];
let filteredVideos = [];
const preloadedVideos = new Set();

function preloadVideo(video) {
    const url = `/video/${video}`;
    console.log(`Starting to preload video: ${video}`);

    // Create an AbortController to be able to cancel the fetch
    const controller = new AbortController();
    const signal = controller.signal;

    // Fetch only the first 1MB of the video
    fetch(url, {
        headers: { 'Range': 'bytes=0-2048575' }, // Fetch the first 1MB
        signal
    })
        .then(response => {
            const reader = response.body.getReader();
            let receivedBytes = 0;

            const stream = new ReadableStream({
                start(controller) {
                    function push() {
                        reader.read().then(({ done, value }) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            receivedBytes += value.length;
                            console.log(`Preloading ${video}: ${receivedBytes} bytes received`);
                            controller.enqueue(value);
                            push();
                        }).catch(err => {
                            console.error('Stream reading error:', err);
                            controller.error(err);
                        });
                    }
                    push();
                }
            });

            return new Response(stream);
        })
        .then(response => response.blob()) // Convert the stream to a blob
        .then(() => {
            console.log(`Video ${video} preloaded successfully`);
        })
        .catch(error => {
            if (error.name !== 'AbortError') {
                console.error('Error preloading video:', error);
            }
        });

    return controller; // Return the controller to be able to abort the fetch
}

function displayThumbnails(videoList) {
    const explorePage = document.getElementById('explorePage');
    explorePage.innerHTML = '';

    videoList.forEach(video => {
        const container = document.createElement('div');
        container.className = 'thumbnail';

        const img = document.createElement('img');
        const videoName = video.replace(".mp4", "");
        img.alt = videoName;
        img.src = `/thumbnail/${videoName}`;
        img.onmousedown = () => playVideo(video);

        let preloadController;

        // Preload video on hover if not already preloaded
        img.onmouseover = () => {
            if (!preloadedVideos.has(video)) {
                preloadController = preloadVideo(video);
                preloadedVideos.add(video);
            }
        };

        // Stop the preload when the mouse leaves the thumbnail
        img.onmouseleave = () => {
            if (preloadController) {
                preloadController.abort(); // Abort the fetch
                preloadController = null;
            }
        };

        container.appendChild(img);
        explorePage.appendChild(container);
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

self.addEventListener('fetch', event => {
    if (event.request.url.includes('/video/')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request).then(networkResponse => {
                    return caches.open('video-cache').then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
});

function playVideo(video) {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoElement = document.getElementById('videoElement');
    const videoTitle = document.getElementById('videoTitle');

    videoElement.src = `/video/${video}`;
    videoTitle.innerText = video;
    videoPlayer.style.display = 'block';
    videoElement.play();
}

function fuzzySearch(query, videoList) {
    //TODO: fine for now but should not load all data into memory in the future
    const queryLower = query.toLowerCase();
    return videoList.filter(video => {
        let queryIndex = 0;
        const videoLower = video.toLowerCase();

        for (let i = 0; i < videoLower.length; i++) {
            if (videoLower[i] === queryLower[queryIndex]) {
                queryIndex++;
            }
            if (queryIndex === queryLower.length) {
                return true;
            }
        }
        return false;
    });
}

document.getElementById('searchBox').addEventListener('input', (e) => {
    const query = e.target.value;
    filteredVideos = fuzzySearch(query, videos);
    displayThumbnails(filteredVideos);
});

fetch('/videos')
    .then(response => response.json())
    .then(data => {
        videos = data;
        filteredVideos = videos;
        displayThumbnails(filteredVideos);
    })
    .catch(error => console.error('Error fetching video list:', error));

//is my idea of caching video when hovering stupid? be brutally honest, i dont care, i just dont want to waste my time
//
//
//Your approach of caching videos on hover has both pros and cons, and its suitability largely depends on the specific context and user behavior you're targeting. Here's an honest assessment of your idea:
//
//### Pros:
//1. **Improved Performance**: Preloading the initial parts of a video could make playback appear nearly instantaneous when a user decides to play a video, enhancing the user experience.
//2. **Efficient Use of Idle Time**: By starting the preload on hover, you're leveraging the time when users are considering watching a video, rather than when they actually decide to play it.
//3. **Minimized Bandwidth Use**: You are only preloading the first 1MB, which is a reasonable compromise between performance and bandwidth usage.
//
//### Cons:
//1. **Unnecessary Data Usage**: Users may hover over several videos without ever playing them, leading to potentially wasted bandwidth and data usage, particularly on metered connections.
//2. **Increased Server Load**: If many users hover over thumbnails frequently, your server could experience increased load due to the number of fetch requests, even if only partial content is requested.
//3. **User Experience Concerns**: If users are on slower connections, the preloading could interfere with other more crucial data fetching tasks, potentially leading to a slower browsing experience overall.
//4. **Complexity**: Implementing and maintaining the abort logic and caching strategy adds complexity to your code, which might not be justified if the feature is not critical to user satisfaction.
//
//### Suggestions:
//- **User Testing**: Conduct user testing to see if preloading actually improves the perceived performance and satisfaction for your target audience.
//- **Conditional Preloading**: Consider enabling this feature only for users with fast internet connections or allow users to opt-in for preloading.
//- **Analytics**: Implement analytics to track how often users play videos after hovering to evaluate if preloading is being effectively utilized.
//- **Alternative Strategies**: Consider lazy-loading videos only when they enter the viewport or are clicked, which might provide a more balanced approach between performance and resource usage.
//
//In summary, your idea is not inherently stupid, but its effectiveness depends on your specific use case and user behavior. It's worth testing and potentially refining based on real-world usage data.

