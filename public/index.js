let videos = [];
let filteredVideos = [];
const preloadedVideos = new Set();

//function displayThumbnails(videoList) {
//    const explorePage = document.getElementById('explorePage');
//    explorePage.innerHTML = '';
//
//    videoList.forEach(video => {
//        const container = document.createElement('div');
//        container.className = 'thumbnail';
//
//        const img = document.createElement('img');
//        const videoName = video.replace(".mp4", "")
//        img.alt = videoName;
//        img.src = `/thumbnail/${videoName}`
//        img.onmousedown = () => playVideo(video);
//        container.appendChild(img);
//        explorePage.appendChild(container);
//    });
//}

//function displayThumbnails(videoList) {
//    const explorePage = document.getElementById('explorePage');
//    explorePage.innerHTML = '';
//
//    videoList.forEach(video => {
//        const container = document.createElement('div');
//        container.className = 'thumbnail';
//
//        const img = document.createElement('img');
//        const videoName = video.replace(".mp4", "")
//        img.alt = videoName;
//        img.src = `/thumbnail/${videoName}`;
//        img.onmousedown = () => playVideo(video);
//
//        // Preload video on hover
//        img.onmouseover = () => preloadVideo(video);
//
//        container.appendChild(img);
//        explorePage.appendChild(container);
//    });
//}

//
//function displayThumbnails(videoList) {
//    const explorePage = document.getElementById('explorePage');
//    explorePage.innerHTML = '';
//
//    videoList.forEach(video => {
//        const container = document.createElement('div');
//        container.className = 'thumbnail';
//
//        const img = document.createElement('img');
//        const videoName = video.replace(".mp4", "");
//        img.alt = videoName;
//        img.src = `/thumbnail/${videoName}`;
//        img.onmousedown = () => playVideo(video);
//
//        // Preload video on hover if not already preloaded
//        img.onmouseover = () => {
//            if (!preloadedVideos.has(video)) {
//                preloadVideo(video);
//                preloadedVideos.add(video);
//            }
//        };
//
//        container.appendChild(img);
//        explorePage.appendChild(container);
//    });
//}
//
//function preloadVideo(video) {
//    const videoPreloadElement = new Image();
//    videoPreloadElement.src = `/video/${video}`;
//    // Optionally, you can store the preloaded video element or its URL 
//    // to avoid re-preloading it in the future.
//}
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

        let videoPreloadElement;

        // Preload video on hover if not already preloaded
        img.onmouseover = () => {
            if (!preloadedVideos.has(video)) {
                videoPreloadElement = preloadVideo(video);
                preloadedVideos.add(video);
            }
        };

        // Stop the preload when the mouse leaves the thumbnail
        img.onmouseleave = () => {
            if (videoPreloadElement) {
                videoPreloadElement.src = ''; // This effectively cancels the preload
                videoPreloadElement = null;
            }
        };

        container.appendChild(img);
        explorePage.appendChild(container);
    });
}

//function preloadVideo(video) {
//    const videoPreloadElement = new Image();
//    videoPreloadElement.src = `/video/${video}`;
//    return videoPreloadElement;
//}
function preloadVideo(video) {
    const url = `/video/${video}`;
    console.log(`Starting to preload video: ${video}`);

    fetch(url)
        .then(response => {
            const contentLength = response.headers.get('content-length');
            if (!contentLength) {
                console.error('Content-Length header is missing');
                return;
            }

            const totalBytes = parseInt(contentLength, 10);
            let receivedBytes = 0;

            const reader = response.body.getReader();
            const stream = new ReadableStream({
                start(controller) {
                    function push() {
                        reader.read().then(({ done, value }) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            receivedBytes += value.length;
                            console.log(`Preloading ${video}: ${receivedBytes}/${totalBytes} bytes received`);
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
        .then(response => response.blob())
        .then(blob => {
            // Optionally, do something with the blob if needed
            console.log(`Video ${video} preloaded successfully`);
        })
        .catch(error => console.error('Error preloading video:', error));
}




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


