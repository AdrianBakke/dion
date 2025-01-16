let videos = [];
let filteredVideos = [];

function displayThumbnails(videoList) {
    const explorePage = document.getElementById('explorePage');
    explorePage.innerHTML = '';

    videoList.forEach(video => {
        const container = document.createElement('div');
        container.className = 'thumbnail';

        const img = document.createElement('img');
        const videoName = video.replace(".mp4", "")
        img.alt = videoName;
        img.src = `/thumbnail/${videoName}`
        img.onmousedown = () => playVideo(video);
        container.appendChild(img);
        explorePage.appendChild(container);
    });
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

